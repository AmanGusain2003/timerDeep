import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/index.js';

interface TimelineProps {
    selectedDate: string;
}

export const Timeline: React.FC<TimelineProps> = ({ selectedDate }) => {
    const logs = useLiveQuery(async () => {
        const arr = await db.timeLogs
            .where('date')
            .equals(selectedDate)
            .sortBy('startTime');
        return arr.reverse(); // Strictly reverse the array to show newest at the top
    }, [selectedDate]);


    const handleDelete = async (id: string) => {
        await db.timeLogs.delete(id);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    if (!logs || logs.length === 0) {
        return (
            <div className="mt-4 text-left text-stone-500 uppercase uppercase">
                NO_RECORDS_FOUND
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col font-mono text-xs md:text-sm border-t-2 border-white">
            {logs.map(log => {
                const isDeepWork = log.type === 'deep-work';
                const typeLabel = isDeepWork ? 'DEEP_WORK' : 'OFFICE   ';
                const startTimeStr = formatTime(log.startTime);
                const endTimeStr = log.endTime ? formatTime(log.endTime) : 'RUNNING';

                let durationStr = '----';
                if (log.endTime) {
                    const diffMins = Math.round((log.endTime.getTime() - log.startTime.getTime()) / 60000);
                    durationStr = `+${diffMins}M`;
                }

                return (
                    <div
                        key={log.id}
                        className="flex items-center justify-between py-2 border-b-2 border-white/50 hover:bg-white/10 transition-none group"
                    >
                        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden whitespace-nowrap">
                            <div className={isDeepWork ? 'text-[var(--color-deep-work)] font-bold' : 'text-[var(--color-office)] font-bold'}>
                                [{startTimeStr}-{endTimeStr}]
                            </div>
                            <div className="text-white opacity-50 hidden sm:block">::</div>
                            <div className={isDeepWork ? 'text-[var(--color-deep-work)] font-bold uppercase' : 'text-[var(--color-office)] font-bold uppercase'}>
                                {typeLabel}
                            </div>
                            <div className="text-white opacity-50 hidden sm:block">::</div>
                            <div className="text-white font-bold w-12 text-right">
                                {durationStr}
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(log.id)}
                            className="px-2 py-1 border border-transparent group-hover:border-red-500 text-stone-600 group-hover:text-red-500 uppercase text-[10px] font-bold transition-none"
                            title="DELETE_RECORD"
                        >
                            [X]
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
