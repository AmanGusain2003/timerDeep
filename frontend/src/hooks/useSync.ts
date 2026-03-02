import { useEffect, useCallback } from 'react';
import { db } from '../db/index.js';
import type { TimeLogLocal } from '../db/index.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const parseTimestamp = (value: unknown): number | null => {
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string') {
        const parsed = new Date(value).getTime();
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
};

const getIncomingLastModified = (log: any): number => {
    const direct = parseTimestamp(log.lastModified);
    if (direct !== null) return direct;
    const updated = parseTimestamp(log.updatedAt);
    if (updated !== null) return updated;
    const end = parseTimestamp(log.endTime);
    if (end !== null) return end;
    const start = parseTimestamp(log.startTime);
    if (start !== null) return start;
    return 0;
};

const getLocalLastModified = (log: TimeLogLocal): number => {
    if (typeof log.lastModified === 'number') return log.lastModified;
    if (log.endTime) return log.endTime.getTime();
    return log.startTime.getTime();
};

const dedupeExactClosedForDate = async (date: string) => {
    const logs = await db.timeLogs.where('date').equals(date).toArray();
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
        if (!log.endTime) continue;
        const key = [
            log.userId,
            log.type,
            log.date,
            log.startTime.getTime(),
            log.endTime.getTime()
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
};

const normalizeServerLog = (log: any): TimeLogLocal | null => {
    const id = log?._id ?? log?.id;
    if (!id) return null;
    if (!log.startTime || !log.date) return null;
    return {
        id,
        userId: log.userId,
        type: log.type,
        startTime: new Date(log.startTime),
        endTime: log.endTime ? new Date(log.endTime) : undefined,
        date: log.date,
        synced: true,
        lastModified: getIncomingLastModified(log)
    };
};

const shouldApplyIncoming = (existing: TimeLogLocal, incoming: TimeLogLocal): boolean => {
    if (existing.synced === false) return false;

    const existingLast = getLocalLastModified(existing);
    const incomingLast = incoming.lastModified ?? 0;

    if (existingLast > incomingLast) return false;
    if (existingLast < incomingLast) return true;

    // Same timestamp: prefer closed log to avoid regressions from closed -> open.
    if (existing.endTime && !incoming.endTime) return false;
    if (!existing.endTime && incoming.endTime) return true;

    return true;
};

const mergeServerLogs = async (serverLogs: any[]) => {
    if (!Array.isArray(serverLogs) || serverLogs.length === 0) return;
    await db.transaction('rw', db.timeLogs, async () => {
        for (const raw of serverLogs) {
            const incoming = normalizeServerLog(raw);
            if (!incoming) continue;

            const existing = await db.timeLogs.get(incoming.id);
            if (!existing) {
                await db.timeLogs.put(incoming);
                continue;
            }

            if (!shouldApplyIncoming(existing, incoming)) {
                continue;
            }

            await db.timeLogs.put({ ...existing, ...incoming, synced: true });
        }
    });
};

export function useSync() {
    const syncLogs = useCallback(async () => {
        if (!navigator.onLine) return;

        try {
            const token = localStorage.getItem('td_token');
            if (!token) return;


            const unsyncedLogs = await db.timeLogs.filter(log => !log.synced).toArray();



            if (unsyncedLogs.length > 0) {
                const res = await fetch(`${API_URL}/logs/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ logs: unsyncedLogs })
                });

                if (res.ok) {
                    // Mark all successfully sent logs as synced
                    const data = await res.json();
                    if (data.success) {
                        const bulkUpdates = unsyncedLogs.map(log => ({
                            key: log.id,
                            changes: { synced: true }
                        }));
                        await db.timeLogs.bulkUpdate(bulkUpdates);
                    }
                    if (data?.serverLogs) {
                        await mergeServerLogs(data.serverLogs);
                        const serverLogs = Array.isArray(data.serverLogs) ? data.serverLogs : [];
                        const dates = Array.from(
                            new Set(
                                (serverLogs as Array<{ date?: string }>)
                                    .map((log) => log.date)
                                    .filter((d): d is string => typeof d === 'string' && d.length > 0)
                            )
                        );
                        for (const date of dates) {
                            await dedupeExactClosedForDate(date);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to sync logs:', error);
        }
    }, []);

    const fetchLogsByDate = useCallback(async (date: string) => {
        const token = localStorage.getItem('td_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/logs/date/${date}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const serverLogs = await res.json();
                await mergeServerLogs(serverLogs);
                await dedupeExactClosedForDate(date);
            }
        } catch (error) {
            console.error(`Failed to fetch logs for ${date}:`, error);
        }
    }, []);


    const token = localStorage.getItem('td_token');

    useEffect(() => {
        // Sync when component mounts or token changes
        if (token) {
            syncLogs();
        }

        // Sync when coming back online
        const handleOnline = () => {
            if (token) syncLogs();
        };
        window.addEventListener('online', handleOnline);

        // Periodic sync every 2 minutes while online
        const interval = setInterval(() => {
            if (navigator.onLine && token) syncLogs();
        }, 120000);

        return () => {
            window.removeEventListener('online', handleOnline);
            clearInterval(interval);
        };
    }, [syncLogs, token]);


    return { syncLogs, fetchLogsByDate };
}
