import { useState, useCallback, useEffect } from 'react';

export function useWakeLock() {
    const [isSupported] = useState('wakeLock' in navigator);
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

    const requestWakeLock = useCallback(async () => {
        if (!isSupported) return;
        try {
            const lock = await navigator.wakeLock.request('screen');
            setWakeLock(lock);

            lock.addEventListener('release', () => {
                setWakeLock(null);
            });
        } catch (err) {
            console.error('Failed to acquire wake lock:', err);
        }
    }, [isSupported]);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLock) {
            await wakeLock.release();
            setWakeLock(null);
        }
    }, [wakeLock]);

    // Re-acquire lock if page becomes visible again
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [wakeLock, requestWakeLock, releaseWakeLock]);

    return { isSupported, isActive: wakeLock !== null, requestWakeLock, releaseWakeLock };
}
