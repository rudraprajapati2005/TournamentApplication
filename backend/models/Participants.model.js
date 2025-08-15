import mongoose  from "mongoose";

const { Schema, model } = mongoose;

const ParticipantSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    matches: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
    
    // Participation details
    registrationDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['registered', 'active', 'eliminated', 'winner'], default: 'registered' },
    currentRound: { type: Number, default: 1 },
    
    // Performance tracking
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    
    // Additional info
    seedNumber: { type: Number }, // For tournament brackets
    notes: { type: String }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Add indexes for quick lookups
ParticipantSchema.index({ user: 1, tournament: 1 }, { unique: true });

export default model('Participant', ParticipantSchema);