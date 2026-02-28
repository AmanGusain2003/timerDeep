import React from 'react';
import { useTimerStore } from '../store/useTimerStore.js';
import clsx from 'clsx';

export const Controls: React.FC = () => {
    const { activeMode, switchMode, user } = useTimerStore();

    const handleSwitch = (mode: 'deep-work' | 'office' | 'waste') => {
        if (!user) return;
        switchMode(mode, user.username);
    };


    return (
        <div className="w-full flex flex-col gap-0 border-2 border-white">
            {/* Deep Work Segment */}
            <button
                onClick={() => handleSwitch('deep-work')}
                className={clsx(
                    "flex flex-col items-center justify-center p-4 font-bold uppercase tracking-widest transition-none border-b-2 border-white",
                    activeMode === 'deep-work'
                        ? "bg-[var(--color-deep-work)] text-black"
                        : "bg-black text-[var(--color-deep-work)] hover:bg-white/10"
                )}
            >
                [ DEEP_WORK ]
            </button>

            {/* Office Segment */}
            <button
                onClick={() => handleSwitch('office')}
                className={clsx(
                    "flex flex-col items-center justify-center p-4 font-bold uppercase tracking-widest transition-none border-b-2 border-white",
                    activeMode === 'office'
                        ? "bg-[var(--color-office)] text-black"
                        : "bg-black text-[var(--color-office)] hover:bg-white/10"
                )}
            >
                [ OFFICE ]
            </button>

            {/* Waste/Free Segment */}
            <button
                onClick={() => handleSwitch('waste')}
                className={clsx(
                    "flex flex-col items-center justify-center p-4 font-bold uppercase tracking-widest transition-none",
                    activeMode === 'waste'
                        ? "bg-white text-black"
                        : "bg-black text-white hover:bg-white/10"
                )}
            >
                [ FREE_TIME ]
            </button>
        </div>
    );
};
