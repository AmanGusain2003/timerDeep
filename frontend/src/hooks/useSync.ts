import { useEffect, useCallback } from 'react';
import { db } from '../db/index.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
                // Merge server logs into local DB
                // We use put to upsert based on the UUID (id)
                for (const log of serverLogs) {
                    await db.timeLogs.put({
                        ...log,
                        id: log._id, // Map backend _id back to local id
                        startTime: new Date(log.startTime),
                        endTime: log.endTime ? new Date(log.endTime) : undefined,
                        synced: true
                    });
                }
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

