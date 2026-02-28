import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface TimeLogLocal {
    id: string; // UUID
    userId: string;
    type: 'deep-work' | 'office';
    startTime: Date;
    endTime?: Date; // Optional until stopped
    date: string; // YYYY-MM-DD
    synced: boolean; // Flag to check if it has been sent to backend
}

export class TimerDeepDB extends Dexie {
    timeLogs!: Table<TimeLogLocal>;

    constructor() {
        super('TimerDeepDB');
        // Define tables with schema
        this.version(1).stores({
            timeLogs: 'id, userId, date, synced' // Indexed fields
        });
    }
}

export const db = new TimerDeepDB();
