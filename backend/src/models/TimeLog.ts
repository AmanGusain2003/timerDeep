import mongoose from 'mongoose';

const timeLogSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Using the UUID from the frontend
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['deep-work', 'office'],
        required: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        required: true,
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true,
        index: true,
    }
});

// Compound index to quickly find user's logs for a specific day
timeLogSchema.index({ userId: 1, date: 1 });

export const TimeLog = mongoose.model('TimeLog', timeLogSchema);
