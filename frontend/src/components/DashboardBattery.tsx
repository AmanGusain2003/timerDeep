import React from 'react';

interface DashboardBatteryProps {
    deepMins: number;
    officeMins: number;
    wasteMins: number;
    totalMins: number;
}

export const DashboardBattery: React.FC<DashboardBatteryProps> = ({
    deepMins,
    officeMins,
    wasteMins,
    totalMins
}) => {
    // Ensure we don't divide by zero
    const safeTotal = totalMins > 0 ? totalMins : 1;

    const deepPct = (deepMins / safeTotal) * 100;
    const officePct = (officeMins / safeTotal) * 100;
    const wastePct = (wasteMins / safeTotal) * 100;

    // Add fixed width representation when 0 to not break layout completely, but in a flex container width percentage handles it cleanly.
    // We use standard percentages but rounded.
    const formatPct = (val: number) => `${Math.round(val)}%`;

    return (
        <div className="flex flex-col w-full font-mono text-white selection:bg-white selection:text-black mb-8">
            {/* Battery Header */}
            <h2 className="uppercase tracking-widest text-lg mb-4 text-center">DASHBOARD // TODAY</h2>

            {/* Battery Container */}
            <div className="relative w-full h-32 border-2 border-white flex mb-8">
                {/* Right terminal of battery */}
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-12 bg-white hidden sm:block"></div>

                {/* Top extra label to match mockup */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-green-400 text-sm tracking-widest bg-black px-2">
                    {formatPct(deepPct + officePct)} PROD
                </div>

                {/* Deep Work Segment */}
                {deepPct > 0 && (
                    <div
                        className="h-full bg-[var(--color-deep-work)] border-r-2 border-black flex items-center justify-center text-black font-bold text-xl relative overflow-hidden group"
                        style={{ width: `${deepPct}%` }}
                    >
                        {/* Liquid-like overlay effect if wanted, but going pure blocky as per mockup */}
                        <span className="z-10">{formatPct(deepPct)}</span>
                    </div>
                )}

                {/* Office Segment */}
                {officePct > 0 && (
                    <div
                        className="h-full bg-[var(--color-office)] border-r-2 border-black flex items-center justify-center text-black font-bold text-xl relative overflow-hidden"
                        style={{ width: `${officePct}%` }}
                    >
                        <span className="z-10">{formatPct(officePct)}</span>
                    </div>
                )}

                {/* Waste Segment */}
                {wastePct > 0 && (
                    <div
                        className="h-full bg-[var(--color-waste)] flex items-center justify-center text-black font-bold text-xl relative overflow-hidden"
                        style={{ width: `${wastePct}%` }}
                    >
                        <span className="z-10">{formatPct(wastePct)}</span>
                    </div>
                )}

                {/* Bottom extra label to match mockup */}
                <div className="absolute -bottom-6 right-2 text-stone-400 text-sm tracking-widest">
                    {formatPct(wastePct)}
                </div>
            </div>

            {/* Stats Table */}
            <div className="w-full border-2 border-white flex flex-col uppercase text-sm font-bold tracking-widest">
                <div className="flex justify-between p-3 border-b border-stone-800 hover:bg-stone-900 transition-colors">
                    <span>DEEP WORK</span>
                    <span>{Math.floor(deepMins)} MIN</span>
                </div>
                <div className="flex justify-between p-3 border-b border-stone-800 hover:bg-stone-900 transition-colors">
                    <span>OFFICE MODE</span>
                    <span>{Math.floor(officeMins)} MIN</span>
                </div>
                <div className="flex justify-between p-3 border-b border-stone-800 hover:bg-stone-900 transition-colors">
                    <span>IDLE / WASTE</span>
                    <span>{Math.floor(wasteMins)} MIN</span>
                </div>
                <div className="flex justify-between p-3 border-b border-stone-800 hover:bg-stone-900 transition-colors">
                    <span>TOTAL LOGGED</span>
                    <span>{(Math.floor(deepMins) + Math.floor(officeMins))} MIN</span>
                </div>
                <div className="flex justify-between p-3 hover:bg-stone-900 transition-colors">
                    <span>EFFICIENCY</span>
                    <span className="text-[var(--color-office)]">{formatPct(deepPct + officePct)}</span>
                </div>
            </div>
        </div>
    );
};
