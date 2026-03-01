import { create } from 'zustand';
import { db } from '../db/index.js';
import type { TimeLogLocal } from '../db/index.js';

interface TimerState {
    isDocked: boolean;
    activeLogId: string | null;
    activeMode: 'deep-work' | 'office' | 'waste';
    user: { username: string } | null;
    token: string | null;
    toggleDock: () => void;
    switchMode: (mode: 'deep-work' | 'office' | 'waste', userId: string) => Promise<void>;
    getActiveLog: () => Promise<TimeLogLocal | null>;
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
            const dateStr = now.toISOString().split('T')[0];
            await db.timeLogs.add({
                id: newId,
                userId,
                type: mode,
                startTime: now,
                date: dateStr,
                synced: false
            });
        }

        // 3. Clean up / close the previous log
        if (previousLogId) {
            await db.timeLogs.update(previousLogId, {
                endTime: now,
                synced: false // Mark for sync update
            });
        }
    },


    getActiveLog: async () => {
        const { activeLogId } = get();
        if (!activeLogId) return null;
        const log = await db.timeLogs.get(activeLogId);
        return log || null;
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

