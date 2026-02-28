import React from 'react';
import { DigitalClock } from './DigitalClock.js';

interface TankProps {
    deepWorkMins: number; // e.g., 120
    officeMins: number;   // e.g., 60
    wasteMins: number;    // e.g., 200
    totalMins: number;    // e.g., representing current time of day in minutes (from 0 to 1440)
    isDocked: boolean;
    activeStartTime?: Date | null;
    activeMode: 'deep-work' | 'office' | 'waste';
}

export const Tank: React.FC<TankProps> = ({ deepWorkMins, officeMins, wasteMins, activeStartTime, activeMode }) => {
    // Tank is a 100% height container filled by percentage based on 1440 mins (24h)
    const maxMins = 1440;

    // Calculate heights, clamped so it doesn't overflow 100% combined
    const deepPct = (deepWorkMins / maxMins) * 100;
    const officePct = (officeMins / maxMins) * 100;
    const wastePct = (wasteMins / maxMins) * 100;

    return (
        <div className="w-full h-80 border-2 border-white relative flex flex-col p-2 bg-black">

            <DigitalClock activeStartTime={activeStartTime || null} activeMode={activeMode} />

            {/* Fake Readouts */}
            <div className="absolute top-2 left-2 text-[8px] text-white opacity-50 flex flex-col font-bold tracking-widest leading-tight">
                <span>MEM: 0x4A</span>
                <span>VOLT: 14.2</span>
            </div>
            <div className="absolute top-2 right-2 text-[8px] text-white opacity-50 flex flex-col font-bold text-right tracking-widest leading-tight">
                <span>SYS: SECURE</span>
                <span>NET: UPLINK</span>
            </div>

            <div className="flex-1 flex flex-col justify-end mt-4">
                {/* Bars are stacked, rendering from bottom up. */}
                {wastePct > 0 && <div className="w-full transition-all duration-1000" style={{ height: `${wastePct}%`, backgroundColor: 'var(--color-waste)' }} />}
                {officePct > 0 && <div className="w-full border-t border-black transition-all duration-1000" style={{ height: `${officePct}%`, backgroundColor: 'var(--color-office)' }} />}
                {deepPct > 0 && <div className="w-full border-t border-black transition-all duration-1000" style={{ height: `${deepPct}%`, backgroundColor: 'var(--color-deep-work)' }} />}
            </div>

            {/* ASCII Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />
            {/* Crosshairs */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />
        </div>
    );
};
