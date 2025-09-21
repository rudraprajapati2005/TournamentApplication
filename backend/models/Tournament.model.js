import mongoose from "mongoose";
const { Schema, model } = mongoose;
const tournamentSchema = new Schema({
    name: {type: String, required: true},
    date: {type: Date, required: true},
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
        type: {type: String, enum: ['single', 'team'], required: true},
        playersPerTeam: {type: Number}, // Required if type is 'team'
        substitutesAllowed: {type: Number, default: 0}, // Number of substitute players allowed per team
        minPlayersPerMatch: {type: Number} // Minimum players required to start a match
    },

    // Tournament Structure
    eliminationType: {type: String, enum: ['single', 'double', 'round-robin'], default: 'single'},
    currentRound: {type: Number, default: 0},
    totalRounds: {type: Number}, // Calculated based on number of participants

    // Relationships
    matches: [{type: mongoose.Schema.Types.ObjectId, ref: 'Match'}],
    participants: [{type: mongoose.Schema.Types.ObjectId, ref: 'Participant'}],
    winners: [{
        position: {type: Number},
        user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
    }],

    // Stats
    currentParticipants: {type: Number, default: 0}, // Current number of registered participants/teams
    matchesCompleted: {type: Number, default: 0},
    matchesTotal: {type: Number, default: 0}
});

// Export the model
export default model('Tournament', tournamentSchema);