import { create } from 'zustand';
import { db } from '../db/index.js';
import type { TimeLogLocal } from '../db/index.js';
import { toLocalDateString } from '../utils/date.js';

interface TimerState {
    isDocked: boolean;
    activeLogId: string | null;
    activeMode: 'deep-work' | 'office' | 'waste';
    user: { username: string } | null;
    token: string | null;
    toggleDock: () => void;
    switchMode: (mode: 'deep-work' | 'office' | 'waste', userId: string) => Promise<void>;
    endActiveLogAt: (endTime: Date) => Promise<void>;
    normalizeLogsAcrossMidnight: () => Promise<void>;
    cleanupDuplicateClosedLogs: () => Promise<void>;
    getActiveLog: () => Promise<TimeLogLocal | null>;
    rehydrateActiveLog: () => Promise<void>;
    setAuth: (user: { username: string }, token: string) => void;
    logout: () => void;
}

const getStoredAuth = () => {
    const token = localStorage.getItem('td_token');
    const user = localStorage.getItem('td_user');
    if (token && user) {
        try {
            return { token, user: JSON.parse(user) };
        } catch (e) {
            return { token: null, user: null };
        }
    }
    return { token: null, user: null };
};

const storedAuth = getStoredAuth();

const endOfLocalDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const splitSegmentsByMidnight = (start: Date, end: Date) => {
    if (end.getTime() <= start.getTime()) return [];

    const segments: Array<{ start: Date; end: Date; date: string }> = [];
    let cursorStart = start;

    while (toLocalDateString(cursorStart) !== toLocalDateString(end)) {
        const eod = endOfLocalDay(cursorStart);
        if (eod.getTime() > cursorStart.getTime()) {
            segments.push({ start: cursorStart, end: eod, date: toLocalDateString(cursorStart) });
        }
        cursorStart = new Date(eod.getTime() + 1);
    }

    if (end.getTime() > cursorStart.getTime()) {
        segments.push({ start: cursorStart, end, date: toLocalDateString(cursorStart) });
    }
    return segments;
};

const buildSplitId = (baseId: string, date: string) => `${baseId}__${date}`;

const closeLogWithSplit = async (logId: string, endTime: Date) => {
    await db.transaction('rw', db.timeLogs, async () => {
        const log = await db.timeLogs.get(logId);
        if (!log) return;

        const start = log.startTime;
        if (endTime.getTime() <= start.getTime()) return;

        const segments = splitSegmentsByMidnight(start, endTime);
        if (segments.length === 0) return;

        const [first, ...rest] = segments;

        await db.timeLogs.update(logId, {
            startTime: first.start,
            endTime: first.end,
            date: first.date,
            synced: false,
            lastModified: first.end.getTime()
        });

        for (const seg of rest) {
            const segId = buildSplitId(log.id, seg.date);
            await db.timeLogs.put({
                id: segId,
                userId: log.userId,
                type: log.type,
                startTime: seg.start,
                endTime: seg.end,
                date: seg.date,
                synced: false,
                lastModified: seg.end.getTime()
            });
        }
    });
};


export const useTimerStore = create<TimerState>((set, get) => ({
    isDocked: false,
    activeLogId: null,
    activeMode: 'waste',
    user: storedAuth.user,
    token: storedAuth.token,
    toggleDock: () => set((state) => ({ isDocked: !state.isDocked })),


    switchMode: async (mode, userId) => {
        const state = get();

        // Prevent re-triggering the same mode
        if (state.activeMode === mode) return;

        const previousLogId = state.activeLogId;
        const now = new Date();

        // 1. Eagerly update state to lock out concurrent double-clicks
        if (mode === 'waste') {
            set({ activeLogId: null, activeMode: 'waste' });
        } else {
            const newId = crypto.randomUUID();
            set({ activeLogId: newId, activeMode: mode });

            // 2. Add the new db log
            const dateStr = toLocalDateString(now);
            await db.timeLogs.add({
                id: newId,
                userId,
                type: mode,
                startTime: now,
                date: dateStr,
                synced: false,
                lastModified: now.getTime()
            });
        }

        // 3. Clean up / close the previous log
        if (previousLogId) {
            await closeLogWithSplit(previousLogId, now);
        }
    },

    endActiveLogAt: async (endTime) => {
        const { activeLogId, activeMode } = get();
        if (!activeLogId || activeMode === 'waste') return;

        await closeLogWithSplit(activeLogId, endTime);

        set({ activeLogId: null, activeMode: 'waste' });
    },

    normalizeLogsAcrossMidnight: async () => {
        const logs = await db.timeLogs.filter(log => !!log.endTime).toArray();
        for (const log of logs) {
            const endTime = log.endTime as Date;
            if (toLocalDateString(log.startTime) === toLocalDateString(endTime)) continue;
            await closeLogWithSplit(log.id, endTime);
        }
    },

    cleanupDuplicateClosedLogs: async () => {
        const logs = await db.timeLogs.filter(log => !!log.endTime).toArray();
        const seen = new Map<string, TimeLogLocal>();
        const toDelete: string[] = [];

        const chooseKeep = (a: TimeLogLocal, b: TimeLogLocal) => {
            if (a.synced && !b.synced) return a;
            if (!a.synced && b.synced) return b;
            const aMod = a.lastModified ?? a.endTime!.getTime();
            const bMod = b.lastModified ?? b.endTime!.getTime();
            return aMod >= bMod ? a : b;
        };

        for (const log of logs) {
            const endTime = log.endTime as Date;
            const key = [
                log.userId,
                log.type,
                log.date,
                log.startTime.getTime(),
                endTime.getTime()
            ].join('|');

            const existing = seen.get(key);
            if (!existing) {
                seen.set(key, log);
                continue;
            }

            const keep = chooseKeep(existing, log);
            const drop = keep.id === existing.id ? log : existing;
            seen.set(key, keep);
            toDelete.push(drop.id);
        }

        if (toDelete.length > 0) {
            await db.timeLogs.bulkDelete(toDelete);
        }
    },


    getActiveLog: async () => {
        const { activeLogId } = get();
        if (!activeLogId) return null;
        const log = await db.timeLogs.get(activeLogId);
        return log || null;
    },

    rehydrateActiveLog: async () => {
        const { activeLogId, activeMode } = get();
        if (activeLogId || activeMode !== 'waste') return;

        const openLogs = await db.timeLogs.filter(log => !log.endTime).toArray();
        if (openLogs.length === 0) return;

        openLogs.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
        const latest = openLogs[0];
        set({ activeLogId: latest.id, activeMode: latest.type });
    },

    setAuth: (user, token) => {
        localStorage.setItem('td_token', token);
        localStorage.setItem('td_user', JSON.stringify(user));
        set({ user, token });
    },

    logout: () => {
        localStorage.removeItem('td_token');
        localStorage.removeItem('td_user');
        set({ user: null, token: null, activeLogId: null, activeMode: 'waste' });
    }
}));
