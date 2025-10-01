import mongoose from "mongoose";


const { Schema, model } = mongoose;

const MatchSchema = new Schema({
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    matchType: { type: String, enum: ['individual', 'team'], required: true },
    status: { type: String, enum: ['upcoming', 'started', 'completed', 'cancelled'], default: 'upcoming' },
    round: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    matchDate: { type: Date },
    matchTime: { type: String },
    scheduledAt: { type: Date },
    durationMinutes: { type: Number },
    location: { type: String },
    description: { type: String },
    startedAt: { type: Date },
    endedAt: { type: Date },

    // Relationships
    participants: [{ type: Schema.Types.ObjectId, ref: 'Participant' }],
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    winner: { type: Schema.Types.ObjectId, refPath: 'winnerModel' },
    winnerModel: { type: String, enum: ['User', 'Team'] },

    // Simple per-entity scores when needed
    score: { type: Map, of: Number, default: {} },

    // Match configuration
    maxParticipants: { type: Number, required: true },
    currentParticipants: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true }
});

// Add timestamps for createdAt and updatedAt
MatchSchema.set('timestamps', true);

export default model('Match', MatchSchema);
