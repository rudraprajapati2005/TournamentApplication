import mongoose from "mongoose";

const { Schema, model } = mongoose;

const joinRequestSchema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverEmail: { type: String, required: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled'], default: 'pending' },
    message: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    // Unread tracking for the receiver
    isRead: { type: Boolean, default: false },
    readAt: { type: Date }
});

joinRequestSchema.index({ team: 1, receiverEmail: 1, status: 1 });
joinRequestSchema.set('timestamps', true);

export default model('JoinRequest', joinRequestSchema);


