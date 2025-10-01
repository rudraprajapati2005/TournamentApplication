import mongoose from "mongoose";
const { Schema, model } = mongoose;
const tournamentSchema = new Schema({
    name: {type: String, required: true},
    // Deprecated: use startDate instead. Kept for backward compatibility.
    date: {type: Date, required: true},
    // Tournament start (date + time)
    startDate: { type: Date, required: true },
    location: {type: String, required: true},
    participantsLimit: {type: Number, required: true}, // Maximum number of participants/teams
    prizePool: {type: Number, required: true},
    organizer: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    status: {type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming'},
    description: {type: String},
    sportType: {type: String, required: true},
    registrationDeadline: {type: Date, required: true},
    
    // Tournament Format
    format: {
        type: {type: String, enum: ['individual', 'team'], required: true},
        playersPerTeam: {type: Number},
        substitutesAllowed: {type: Number, default: 0},
        minPlayersPerMatch: {type: Number},
        matchSize: { type: Number, default: 2 }, // e.g., 1v1 => 2 participants per match
        scoringMethod: { type: String, enum: ['manual', 'auto'], default: 'auto' }
    },

    // Tournament Structure
    eliminationType: {type: String, enum: ['single', 'double', 'round-robin'], default: 'single'},
    advancementCount: { type: Number, default: 1 },
    formatType: { type: String, enum: ['tree', 'table'], default: 'tree' },
    currentRound: {type: Number, default: 0},
    totalRounds: {type: Number}, // Calculated based on number of participants

    // Relationships
    matches: [{type: mongoose.Schema.Types.ObjectId, ref: 'Match'}],
    participants: [{type: mongoose.Schema.Types.ObjectId, ref: 'Participant'}],
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    winners: [{
        position: {type: Number},
        user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
    }],

    // Stats
    currentParticipants: {type: Number, default: 0}, // Current number of registered participants/teams
    matchesCompleted: {type: Number, default: 0},
    matchesTotal: {type: Number, default: 0}
});

// Ensure startDate is set based on legacy date field if missing
tournamentSchema.pre('validate', function(next) {
    if (!this.startDate && this.date) {
        this.startDate = this.date;
    }

    // Backward compatibility: some old documents stored elimination type in format.type
    // e.g., format.type: 'single' | 'double' | 'round-robin'. Move it and set a safe format.type.
    if (this.format && typeof this.format.type === 'string') {
        const legacyElims = ['single', 'double', 'round-robin'];
        const currentType = String(this.format.type).toLowerCase();
        if (legacyElims.includes(currentType)) {
            // Set eliminationType if not already set
            if (!this.eliminationType) {
                this.eliminationType = currentType;
            }
            // Choose a sensible default for participant format
            const playersPerTeam = this.format.playersPerTeam;
            this.format.type = (typeof playersPerTeam === 'number' && playersPerTeam > 1)
                ? 'team'
                : 'individual';
        }
    }
    next();
});

// Auto-transition status from upcoming to ongoing when startDate passes
tournamentSchema.pre('save', function(next) {
    if (this.status === 'upcoming' && this.startDate) {
        const start = new Date(this.startDate);
        if (!isNaN(start.getTime()) && new Date() >= start) {
            this.status = 'ongoing';
        }
    }
    next();
});

// Export the model
export default model('Tournament', tournamentSchema);