import mongoose from "mongoose";

const { Schema, model } = mongoose;

const scoreSchema = new Schema({
    // For individual matches, store user in player. For team matches, player can be null and team is used.
    player: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    team: { type: Schema.Types.ObjectId, ref: 'Team' },
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    points: { type: Number, default: 0 },
    metrics: { type: Map, of: Number, default: {} }, // sport-specific metrics (runs, wickets, goals...)
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Unique per player per match (for individual)
scoreSchema.index({ match: 1, player: 1 }, { unique: true, sparse: true });
// Unique per team per match (for team-based)
scoreSchema.index({ match: 1, team: 1 }, { unique: true, sparse: true });
scoreSchema.set('timestamps', true);

export default model('Score', scoreSchema);


