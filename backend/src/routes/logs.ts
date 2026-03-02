import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TimeLog } from '../models/TimeLog.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-fallback';

// Middleware to verify JWT
const authMiddleware = (req: any, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

router.use(authMiddleware);

// Sync offline logs to the server
router.post('/sync', async (req: any, res) => {
    try {
        const { logs } = req.body; // Array of logs from Dexie
        if (!Array.isArray(logs)) return res.status(400).json({ error: 'Logs array required' });

        const toTimestamp = (value: any) => {
            if (typeof value === 'number') return value;
            const parsed = new Date(value).getTime();
            return Number.isNaN(parsed) ? undefined : parsed;
        };

        const normalizeLog = (log: any) => {
            if (!log?.id || !log?.date || !log?.startTime) return null;
            const lastModified =
                toTimestamp(log.lastModified) ??
                toTimestamp(log.endTime) ??
                toTimestamp(log.startTime) ??
                Date.now();

            return {
                ...log,
                _id: log.id,
                userId: req.userId,
                lastModified
            };
        };

        const normalizedLogs = logs
            .map(normalizeLog)
            .filter(Boolean) as any[];

        const bulkOps = normalizedLogs.map(log => ({
            updateOne: {
                filter: { _id: log._id, userId: req.userId }, // Sync via the Dexie UUID
                update: { $set: { ...log } },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await TimeLog.bulkWrite(bulkOps);
        }

        // Return logs for affected dates to ensure client is in sync
        const dates = [...new Set(normalizedLogs.map(log => log.date))];
        const serverLogs = dates.length > 0
            ? await TimeLog.find({ userId: req.userId, date: { $in: dates } })
            : [];

        res.json({ success: true, serverLogs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during sync' });
    }
});

// Fetch all logs for a specific date
router.get('/date/:date', async (req: any, res) => {
    try {
        const logs = await TimeLog.find({ userId: req.userId, date: req.params.date }).sort({ startTime: 1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Allow user to delete a log (e.g. if they made a mistake)
router.delete('/:id', async (req: any, res) => {
    try {
        await TimeLog.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
