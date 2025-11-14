import express from 'express';
import Tournament from '../models/Tournament.model.js';
import Score from '../models/Score.model.js';
import Participant from '../models/Participant.model.js';
import User from '../models/User.model.js';
import { isAuthenticated, isOrganizer } from '../middleware/auth.middleware.js';

const router = express.Router();

// Create a new tournament
router.post('/create', isAuthenticated, isOrganizer, async (req, res) => {
    try {
        const tournament = new Tournament(req.body);
        await tournament.save();
        
        res.status(201).json({
            success: true,
            message: 'Tournament created successfully',
            tournament
        });
    } catch (error) {
        console.error('Error creating tournament:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating tournament',
            error: error.message
        });
    }
});

// Get all tournaments
router.get('/', async (req, res) => {
    try {
        const tournaments = await Tournament.find()
            .populate('organizer', 'name email')
            .sort({ startDate: -1, date: -1 });
        
        res.json({
            success: true,
            tournaments
        });
    } catch (error) {
        console.error('Error fetching tournaments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tournaments',
            error: error.message
        });
    }
});

// Get latest tournaments
router.get('/latest', async (req, res) => {
    try {
        const tournaments = await Tournament.find({ status: 'upcoming' })
            .populate('organizer', 'name email')
            .sort({ startDate: 1, date: 1 })
            .limit(6);
        
        res.json({
            success: true,
            tournaments
        });
    } catch (error) {
        console.error('Error fetching latest tournaments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching latest tournaments',
            error: error.message
        });
    }
});

// Get ongoing tournaments
router.get('/ongoing', async (req, res) => {
    try {
        const tournaments = await Tournament.find({ status: 'ongoing' })
            .populate('organizer', 'name email')
            .sort({ startDate: -1, date: -1 })
            .limit(6);
        
        res.json({
            success: true,
            tournaments
        });
    } catch (error) {
        console.error('Error fetching ongoing tournaments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ongoing tournaments',
            error: error.message
        });
    }
});

// Get tournaments organized by a specific user
router.get('/organized/:userId', isAuthenticated, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check if user is requesting their own tournaments or is an admin
        if (req.user._id.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only view your own organized tournaments'
            });
        }

        const tournaments = await Tournament.find({ organizer: userId })
            .populate('organizer', 'name email')
            .sort({ startDate: -1, date: -1 });
        
        res.json({
            success: true,
            tournaments
        });
    } catch (error) {
        console.error('Error fetching organized tournaments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching organized tournaments',
            error: error.message
        });
    }
});

// Get tournament by ID
router.get('/:id', async (req, res) => {
    try {
        let tournament = await Tournament.findById(req.params.id)
            .populate('organizer', 'name email')
            .populate('winners.user', 'name email')
            .populate({
                path: 'participants',
                populate: { path: 'user', select: 'name email' }
            })
            .populate({
                path: 'matches',
                populate: [
                    {
                        path: 'participants',
                        populate: { path: 'user', select: 'name email' }
                    },
                    {
                        path: 'teams',
                        select: 'name'
                    }
                ]
            });
        
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        
        // Auto-update status if startDate passed (date kept for backward compatibility)
        if (tournament.status === 'upcoming') {
            const start = new Date(tournament.startDate || tournament.date);
            if (!isNaN(start.getTime()) && new Date() >= start) {
                tournament.status = 'ongoing';
                await tournament.save();
            }
        }

        // Attach scores per match so UI can prefill inputs
        const allScores = await Score.find({ tournament: tournament._id });
        const scoresByMatch = {};
        for (const s of allScores) {
            const matchId = s.match?.toString?.();
            if (!matchId) continue;
            const entityId = (s.team?.toString?.()) || (s.player?.toString?.()); // team for team-matches, user for individual
            if (!entityId) continue;
            if (!scoresByMatch[matchId]) scoresByMatch[matchId] = {};
            scoresByMatch[matchId][entityId] = s.points || 0;
        }

        const tObj = tournament.toObject();
        const matchesWithScores = (tObj.matches || []).map(m => {
            const mid = m._id?.toString?.();
            const scores = scoresByMatch[mid] || {};
            // also mirror under existing match.score field name for redundancy
            const next = { ...m, scores };
            next.score = scores;
            return next;
        });

        res.json({ success: true, tournament: { ...tObj, matches: matchesWithScores } });
    } catch (error) {
        console.error('Error fetching tournament:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tournament',
            error: error.message
        });
    }
});

// Update tournament (only if not ongoing or completed)
router.put('/:id', isAuthenticated, isOrganizer, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        // Check if user is the organizer
        if (tournament.organizer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit tournaments you created'
            });
        }

        // Allow status change to completed/cancelled at any time, and only status
        const requestedStatus = req.body?.status;
        const isTerminalStatus = requestedStatus === 'completed' || requestedStatus === 'cancelled';
        if (isTerminalStatus) {
            // Only allow changing status field; ignore/deny other fields
            const allowedBody = { status: requestedStatus };
            const updatedTournament = await Tournament.findByIdAndUpdate(
                req.params.id,
                allowedBody,
                { new: true, runValidators: true }
            ).populate('organizer', 'name email');

            return res.json({
                success: true,
                message: 'Tournament status updated',
                tournament: updatedTournament
            });
        }

        // Otherwise, regular edits are only allowed if not ongoing or completed
        if (tournament.status === 'ongoing' || tournament.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit tournament that is ongoing or completed'
            });
        }

        // Update tournament with provided fields
        const updatedTournament = await Tournament.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('organizer', 'name email');

        res.json({
            success: true,
            message: 'Tournament updated successfully',
            tournament: updatedTournament
        });
    } catch (error) {
        console.error('Error updating tournament:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating tournament',
            error: error.message
        });
    }
});

// Delete tournament (only if not ongoing or completed)
router.delete('/:id', isAuthenticated, isOrganizer, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        // Check if user is the organizer
        if (tournament.organizer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete tournaments you created'
            });
        }

        // Check if tournament can be deleted (not ongoing or completed)
        if (tournament.status === 'ongoing' || tournament.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete tournament that is ongoing or completed'
            });
        }

        await Tournament.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Tournament deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting tournament:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting tournament',
            error: error.message
        });
    }
});

// Join a tournament
router.post('/:id/join', isAuthenticated, async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const userId = req.user._id;

        // Check if user is a participant (not organizer)
        if (req.user.role === 'Organizer') {
            return res.status(400).json({
                success: false,
                message: 'Organizers cannot join tournaments as participants'
            });
        }

        // Find the tournament
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        // Disallow individual join for team-based tournaments
        if (tournament.format?.type === 'team') {
            return res.status(400).json({
                success: false,
                message: 'This is a team-based tournament. Please create or join a team.'
            });
        }

        // Check if tournament is still accepting registrations
        if (tournament.status !== 'upcoming') {
            return res.status(400).json({
                success: false,
                message: 'Tournament is not accepting new participants'
            });
        }

        // Check if registration deadline has passed
        if (new Date() > new Date(tournament.registrationDeadline)) {
            return res.status(400).json({
                success: false,
                message: 'Registration deadline has passed'
            });
        }

        // Check if tournament is full
        if (tournament.currentParticipants >= tournament.participantsLimit) {
            return res.status(400).json({
                success: false,
                message: 'Tournament is full'
            });
        }

        // Check if user is already participating
        const existingParticipation = await Participant.findOne({
            user: userId,
            tournament: tournamentId
        });

        if (existingParticipation) {
            return res.status(400).json({
                success: false,
                message: 'You are already participating in this tournament'
            });
        }

        // Create participation record
        const participation = new Participant({
            user: userId,
            tournament: tournamentId,
            status: 'registered'
        });

        await participation.save();

        // Update tournament participant count
        tournament.currentParticipants += 1;
        tournament.participants.push(participation._id);
        await tournament.save();

        // Update user's participations
        const user = await User.findById(userId);
        user.participations.push(participation._id);
        user.participatedTournaments.push(tournamentId);
        await user.save();

        res.json({
            success: true,
            message: 'Successfully joined tournament',
            participation
        });

    } catch (error) {
        console.error('Error joining tournament:', error);
        res.status(500).json({
            success: false,
            message: 'Error joining tournament',
            error: error.message
        });
    }
});

// Leave a tournament
router.post('/:id/leave', isAuthenticated, async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const userId = req.user._id;

        // Find the participation record
        const participation = await Participant.findOne({
            user: userId,
            tournament: tournamentId
        });

        if (!participation) {
            return res.status(404).json({
                success: false,
                message: 'You are not participating in this tournament'
            });
        }

        // Check if tournament has already started
        const tournament = await Tournament.findById(tournamentId);
        if (tournament.status === 'ongoing' || tournament.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot leave tournament that has already started or completed'
            });
        }

        // Remove participation
        await Participant.findByIdAndDelete(participation._id);

        // Update tournament participant count
        tournament.currentParticipants -= 1;
        tournament.participants = tournament.participants.filter(
            p => p.toString() !== participation._id.toString()
        );
        await tournament.save();

        // Update user's participations
        const user = await User.findById(userId);
        user.participations = user.participations.filter(
            p => p.toString() !== participation._id.toString()
        );
        user.participatedTournaments = user.participatedTournaments.filter(
            t => t.toString() !== tournamentId
        );
        await user.save();

        res.json({
            success: true,
            message: 'Successfully left tournament'
        });

    } catch (error) {
        console.error('Error leaving tournament:', error);
        res.status(500).json({
            success: false,
            message: 'Error leaving tournament',
            error: error.message
        });
    }
});

// Check participation status
router.get('/:id/participation-status', isAuthenticated, async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const userId = req.user._id;

        const participation = await Participant.findOne({
            user: userId,
            tournament: tournamentId
        }).populate('tournament', 'name status registrationDeadline participantsLimit currentParticipants');

        if (!participation) {
            return res.json({
                success: true,
                isParticipating: false,
                canJoin: true,
                reason: 'Not participating'
            });
        }

        const tournament = participation.tournament;
        const canJoin = tournament.status === 'upcoming' && 
                       new Date() <= new Date(tournament.registrationDeadline) &&
                       tournament.currentParticipants < tournament.participantsLimit;

        res.json({
            success: true,
            isParticipating: true,
            participation,
            canJoin,
            reason: canJoin ? 'Can join' : 'Cannot join'
        });

    } catch (error) {
        console.error('Error checking participation status:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking participation status',
            error: error.message
        });
    }
});

// Get all tournaments user can participate in
router.get('/available', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;

        // Get all upcoming tournaments
        const tournaments = await Tournament.find({ status: 'upcoming' })
            .populate('organizer', 'name email')
            .sort({ startDate: 1, date: 1 });

        // Get user's current participations
        const participations = await Participant.find({ user: userId })
            .populate('tournament', '_id');

        const participatingTournamentIds = participations.map(p => p.tournament._id.toString());

        // Filter tournaments and add participation status
        const availableTournaments = tournaments.map(tournament => {
            const isParticipating = participatingTournamentIds.includes(tournament._id.toString());
            const canJoin = !isParticipating && 
                           new Date() <= new Date(tournament.registrationDeadline) &&
                           tournament.currentParticipants < tournament.participantsLimit;

            return {
                ...tournament.toObject(),
                isParticipating,
                canJoin
            };
        });

        res.json({
            success: true,
            tournaments: availableTournaments
        });

    } catch (error) {
        console.error('Error fetching available tournaments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available tournaments',
            error: error.message
        });
    }
});

// Get tournaments user has participated in
router.get('/participated', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;

        // Get user's participations with tournament details
        const participations = await Participant.find({ user: userId })
            .populate({
                path: 'tournament',
                populate: {
                    path: 'organizer',
                    select: 'name email'
                }
            })
            .sort({ registrationDate: -1 });

        // Transform participations to include tournament data
        const participatedTournaments = participations.map(participation => ({
            ...participation.tournament.toObject(),
            participation: {
                _id: participation._id,
                status: participation.status,
                registrationDate: participation.registrationDate,
                currentRound: participation.currentRound,
                matchesPlayed: participation.matchesPlayed,
                matchesWon: participation.matchesWon,
                totalScore: participation.totalScore
            }
        }));

        res.json({
            success: true,
            tournaments: participatedTournaments
        });

    } catch (error) {
        console.error('Error fetching participated tournaments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching participated tournaments',
            error: error.message
        });
    }
});

// Declare top players manually (by organizer or organizing team)
router.post('/:id/declare-winners', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { winners } = req.body;
        
        const tournament = await Tournament.findById(id);
        
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        // Check if user is organizer
        const isOrganizer = tournament.organizer.toString() === req.user._id.toString();
        
        // Check if user is organizing team member
        let isOrganizingMember = false;
        if (!isOrganizer) {
            const Team = (await import('../models/Team.model.js')).default;
            const organizingTeam = await Team.findOne({ 
                tournament: id, 
                isOrganizing: true 
            });
            
            if (organizingTeam) {
                if (organizingTeam.leader?.toString() === req.user._id.toString()) {
                    isOrganizingMember = true;
                } else if (organizingTeam.members?.some(m => m.user?.toString() === req.user._id.toString())) {
                    isOrganizingMember = true;
                }
            }
        }

        if (!isOrganizer && !isOrganizingMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organizers or organizing team members can declare winners'
            });
        }

        // Validate winners array
        if (!Array.isArray(winners) || winners.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Winners array is required'
            });
        }

        // Validate and process winners
        const processedWinners = [];
        for (const winner of winners) {
            if (!winner.position || !winner.user) {
                return res.status(400).json({
                    success: false,
                    message: 'Each winner must have position and user fields'
                });
            }
            
            // Check if position is valid (1 = winner, 2 = runner-up, 3 = second runner-up, etc.)
            if (winner.position < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Position must be at least 1'
                });
            }

            processedWinners.push({
                position: winner.position,
                user: winner.user
            });
        }

        // Update tournament with winners
        tournament.winners = processedWinners;
        
        // Optionally mark tournament as completed
        if (tournament.status !== 'completed') {
            tournament.status = 'completed';
        }
        
        await tournament.save();

        // Update Participant records for winners
        const winnerUserIds = processedWinners.map(w => w.user.toString());
        
        // Mark winners as 'winner' status
        await Participant.updateMany(
            { 
                tournament: id, 
                user: { $in: winnerUserIds } 
            },
            { 
                $set: { status: 'winner' } 
            }
        );

        // Mark all other participants as 'eliminated' if they're still active/registered
        await Participant.updateMany(
            { 
                tournament: id, 
                user: { $nin: winnerUserIds },
                status: { $in: ['registered', 'active'] }
            },
            { 
                $set: { status: 'eliminated' } 
            }
        );

        const updatedTournament = await Tournament.findById(id)
            .populate('organizer', 'name email')
            .populate('winners.user', 'name email');

        res.json({
            success: true,
            message: 'Winners declared successfully',
            tournament: updatedTournament
        });

    } catch (error) {
        console.error('Error declaring winners:', error);
        res.status(500).json({
            success: false,
            message: 'Error declaring winners',
            error: error.message
        });
    }
});

export default router;
