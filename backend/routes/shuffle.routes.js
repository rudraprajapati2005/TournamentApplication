import express from 'express';
import Tournament from '../models/Tournament.model.js';
import Match from '../models/Match.model.js';
import Participant from '../models/Participant.model.js';
import Team from '../models/Team.model.js';
import { isAuthenticated, isOrganizer } from '../middleware/auth.middleware.js';

const router = express.Router();

function shuffleArray(items) {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Shuffle participants or teams into matches
router.post('/shuffle', isAuthenticated, isOrganizer, async (req, res) => {
    try {
        const { tournamentId, round } = req.body;
        const tournament = await Tournament.findById(tournamentId).populate('teams');
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const matchSize = tournament.format?.matchSize || 2;
        const matchType = tournament.format?.type === 'team' ? 'team' : 'individual';

        let entities = [];
        if (matchType === 'team') {
            entities = tournament.teams || [];
        } else {
            entities = await Participant.find({ tournament: tournamentId });
        }

        const shuffled = shuffleArray(entities.map(e => e._id ? e._id : e));
        const createdMatches = [];
        for (let i = 0; i < shuffled.length; i += matchSize) {
            const group = shuffled.slice(i, i + matchSize);
            if (group.length < matchSize) break;
            const match = await Match.create({
                tournament: tournamentId,
                round: round || 1,
                matchType,
                maxParticipants: matchSize,
                status: 'upcoming',
                teams: matchType === 'team' ? group : [],
                participants: matchType === 'individual' ? group : []
            });
            createdMatches.push(match);
        }
        await Tournament.findByIdAndUpdate(tournamentId, { $addToSet: { matches: { $each: createdMatches.map(m => m._id) } } });
        return res.json({ success: true, matches: createdMatches });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Shuffle failed' });
    }
});

export default router;


