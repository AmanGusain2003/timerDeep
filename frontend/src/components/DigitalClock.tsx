import React, { useEffect, useState } from 'react';

interface DigitalClockProps {
    activeStartTime: Date | null;
    activeMode: 'deep-work' | 'office' | 'waste';
}

export const DigitalClock: React.FC<DigitalClockProps> = ({ activeStartTime, activeMode }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!activeStartTime || activeMode === 'waste') {
            setElapsed(0);
            return;
        }

        // Safe conversion of string dates from Dexie if needed, though they should be Date objects
        const start = new Date(activeStartTime);

        // Initialize immediately
        setElapsed(Math.floor((new Date().getTime() - start.getTime()) / 1000));

        const interval = setInterval(() => {
            setElapsed(Math.floor((new Date().getTime() - start.getTime()) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [activeStartTime, activeMode]);


    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const colorClass = activeMode === 'deep-work' ? 'text-[var(--color-deep-work)] drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]' :
        activeMode === 'office' ? 'text-[var(--color-office)] drop-shadow-[0_0_8px_rgba(0,255,0,0.4)]' :
            'text-stone-500';

    return (
        <div className={`font-mono text-6xl font-bold tracking-tighter ${colorClass} transition-colors duration-500 relative z-10 text-center w-full`}>
            <span>{formatTime(elapsed)}</span>
            <span className="animate-pulse text-4xl align-text-bottom">_</span>
        </div>
    );
};
