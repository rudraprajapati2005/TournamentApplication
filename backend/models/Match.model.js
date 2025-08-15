import mongoose from "mongoose";


const { Schema, model } = mongoose;

const MatchSchema = new Schema({
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true }, // Reference to Tournament
    matchType: { type: String, enum: ['one-on-one', 'group'], required: true },
    status: { type: String, enum: ['pending', 'ongoing', 'completed', 'cancelled'], default: 'pending' },
    round: { type: Number, required: true }, // Round number in the tournament
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    matchDate: { type: Date, required: true },
    matchTime: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String },
    
    // Relationships
    participants: [{ type: Schema.Types.ObjectId, ref: 'Participant' }],
    winner: { type: Schema.Types.ObjectId, ref: 'User' },
    score: {
        type: Map,
        of: Number,
        default: {}
    },
    
    // Match configuration
    maxParticipants: { type: Number, required: true },
    currentParticipants: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true }
});

// Add timestamps for createdAt and updatedAt
MatchSchema.set('timestamps', true);

export default model('Match', MatchSchema);
