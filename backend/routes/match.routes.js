import express from 'express';
import Match from '../models/Match.model.js';
import Tournament from '../models/Tournament.model.js';
import Participant from '../models/Participant.model.js';
import Team from '../models/Team.model.js';
import Score from '../models/Score.model.js';
import { isAuthenticated, isOrganizer } from '../middleware/auth.middleware.js';

const router = express.Router();

// Schedule matches
router.post('/schedule', isAuthenticated, isOrganizer, async (req, res) => {
    try {
        const { tournamentId, round, matchType, maxParticipants, scheduledAt, durationMinutes } = req.body;
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
        const match = await Match.create({
            tournament: tournamentId,
            round,
            matchType,
            maxParticipants,
            scheduledAt,
            durationMinutes,
            status: 'upcoming'
        });
        await Tournament.findByIdAndUpdate(tournamentId, { $addToSet: { matches: match._id } });
        return res.status(201).json({ success: true, match });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to schedule match' });
    }
});

// Auto-schedule Round 1 based on current entries (participants or teams)
router.post('/auto-schedule/:tournamentId', isAuthenticated, isOrganizer, async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const tournament = await Tournament.findById(tournamentId)
            .populate('participants')
            .populate({ path: 'teams', populate: { path: 'members.user', select: 'name email' } });
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        // Determine match type from tournament format
        const matchType = tournament.format?.type === 'team' ? 'team' : 'individual';

        // Collect entries
        let entries = [];
        if (matchType === 'team') {
            entries = (tournament.teams || []).filter(Boolean);
        } else {
            entries = (tournament.participants || []).filter(Boolean);
        }

        if (entries.length < 2) {
            // Cancel the tournament due to insufficient participants
            await Tournament.findByIdAndUpdate(tournamentId, { status: 'cancelled' });
            return res.status(400).json({ 
                success: false, 
                message: 'Not enough entries to schedule matches. Tournament has been cancelled.',
                tournamentCancelled: true 
            });
        }

        // Simple pairing: sequential pairs
        const createdMatches = [];
        for (let i = 0; i < entries.length; i += 2) {
            const a = entries[i];
            const b = entries[i + 1];
            if (!b) break; // odd leftover, skip for now

            const matchDoc = {
                tournament: tournament._id,
                matchType,
                round: 1,
                status: 'upcoming',
                maxParticipants: 2,
            };

            if (matchType === 'team') {
                matchDoc.teams = [a._id, b._id];
            } else {
                matchDoc.participants = [a._id, b._id];
            }

            const match = await Match.create(matchDoc);
            createdMatches.push(match);
        }

        // Attach to tournament
        if (createdMatches.length) {
            await Tournament.findByIdAndUpdate(tournamentId, { $addToSet: { matches: { $each: createdMatches.map(m => m._id) } } });
        }

        return res.status(201).json({ success: true, matches: createdMatches });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to auto-schedule matches' });
    }
});

// Force start a match
router.post('/:matchId/start', isAuthenticated, isOrganizer, async (req, res) => {
    try {
        const { matchId } = req.params;
        const match = await Match.findByIdAndUpdate(matchId, { status: 'started', startedAt: new Date() }, { new: true });
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
        return res.json({ success: true, match });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to start match' });
    }
});

// Input score for a player (and optional team)
router.post('/:matchId/score', isAuthenticated, async (req, res) => {
    try {
        const { matchId } = req.params;
        const { playerId, teamId, points, metrics } = req.body;
        const match = await Match.findById(matchId)
            .populate('tournament')
            .populate({ path: 'participants', populate: { path: 'user', select: 'name' } })
            .populate({ path: 'teams', populate: { path: 'members.user', select: 'name' } });
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

        // Authorization: allow tournament organizer, organizing team members, or actual participants
        let isAllowed = false;

        // Organizer can submit
        if (match.tournament?.organizer?.toString?.() === req.user._id.toString()) {
            isAllowed = true;
        }

        // Organizing team members can submit
        if (!isAllowed) {
            const orgTeam = await Team.findOne({ tournament: match.tournament._id, isOrganizing: true });
            if (orgTeam) {
                if (orgTeam.leader?.toString?.() === req.user._id.toString()) {
                    isAllowed = true;
                } else if ((orgTeam.members || []).some(m => m.user?.toString?.() === req.user._id.toString())) {
                    isAllowed = true;
                }
            }
        }

        // Players in the match (individual) or team members (team) can submit
        if (!isAllowed) {
            if (match.matchType === 'individual') {
                isAllowed = (match.participants || []).some(p => p.user?.toString?.() === req.user._id.toString());
            } else {
                for (const t of (match.teams || [])) {
                    if (t.members?.some(m => m.user?.toString?.() === req.user._id.toString())) {
                        isAllowed = true; break;
                    }
                }
            }
        }
        if (!isAllowed) {
            return res.status(403).json({ success: false, message: 'You are not a participant in this match' });
        }

        // Build unique filter depending on match type / payload
        const filter = teamId ? { match: matchId, team: teamId } : { match: matchId, player: playerId };
        const update = {
            $set: {
                tournament: match.tournament._id,
                points: points || 0,
                metrics: metrics || {},
                createdBy: req.user._id,
                team: teamId || undefined,
                player: playerId || undefined
            }
        };
        const score = await Score.findOneAndUpdate(
            filter,
            update,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return res.json({ success: true, score });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to save score' });
    }
});

// Auto declare winner (with manual override if tie)
router.post('/:matchId/declare', isAuthenticated, isOrganizer, async (req, res) => {
    try {
        const { matchId } = req.params;
        const { overrideWinnerId, overrideModel } = req.body; // Manual override
        const match = await Match.findById(matchId).populate('teams').populate('participants');
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

        let winnerId = null;
        let winnerModel = null;

        if (overrideWinnerId && overrideModel) {
            winnerId = overrideWinnerId;
            winnerModel = overrideModel; // 'User' | 'Team'
        } else {
            if (match.matchType === 'team') {
                const teamScores = {};
                const scores = await Score.find({ match: matchId });
                for (const s of scores) {
                    if (!s.team) continue;
                    teamScores[s.team.toString()] = (teamScores[s.team.toString()] || 0) + (s.points || 0);
                }
                const ranked = Object.entries(teamScores).sort((a, b) => b[1] - a[1]);
                if (ranked.length >= 2 && ranked[0][1] === ranked[1][1]) {
                    return res.status(409).json({ success: false, message: 'Tie detected. Provide manual override.' });
                }
                if (ranked.length) {
                    winnerId = ranked[0][0];
                    winnerModel = 'Team';
                }
            } else {
                const scores = await Score.find({ match: matchId });
                const ranked = scores.sort((a, b) => (b.points || 0) - (a.points || 0));
                if (ranked.length >= 2 && (ranked[0].points || 0) === (ranked[1].points || 0)) {
                    return res.status(409).json({ success: false, message: 'Tie detected. Provide manual override.' });
                }
                if (ranked.length) {
                    winnerId = ranked[0].player;
                    winnerModel = 'User';
                }
            }
        }

        if (!winnerId) return res.status(400).json({ success: false, message: 'Unable to determine winner' });

        match.winner = winnerId;
        match.winnerModel = winnerModel;
        match.status = 'completed';
        match.endedAt = new Date();
        await match.save();
        return res.json({ success: true, match });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to declare winner' });
    }
});

export default router;


