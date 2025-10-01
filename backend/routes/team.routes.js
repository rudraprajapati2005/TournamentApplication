import express from 'express';
import Team from '../models/Team.model.js';
import Tournament from '../models/Tournament.model.js';
import User from '../models/User.model.js';
import JoinRequest from '../models/JoinRequest.model.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get my teams (leader or member)
router.get('/mine', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const teams = await Team.find({
            $or: [
                { leader: userId },
                { 'members.user': userId }
            ]
        })
        .populate('tournament', 'name sportType date description location format.playersPerTeam')
        .populate('leader', 'name email')
        .populate('members.user', 'name email');
        return res.json({ success: true, teams });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to load teams' });
    }
});

// Create a team (unique per tournament)
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { name, tournamentId, isOrganizing } = req.body;
        if (!name || !tournamentId) {
            return res.status(400).json({ success: false, message: 'Missing name or tournamentId' });
        }
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        // Only the organizer can create organizing team
        if (isOrganizing) {
            if (tournament.organizer.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Only tournament organizer can create organizing team' });
            }
            const existingOrg = await Team.findOne({ tournament: tournamentId, isOrganizing: true });
            if (existingOrg) {
                return res.status(409).json({ success: false, message: 'Organizing team already exists for this tournament' });
            }
        }

        const team = await Team.create({ name, tournament: tournamentId, leader: req.user._id, members: [{ user: req.user._id, role: 'member' }], isOrganizing: !!isOrganizing });

        await Tournament.findByIdAndUpdate(tournamentId, { $addToSet: { teams: team._id } });

        return res.status(201).json({ success: true, team });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'Team name already exists in this tournament' });
        }
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to create team' });
    }
});

// Search users by email (prefix match)
router.get('/search-users', isAuthenticated, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, users: [] });
        const users = await User.find({ email: { $regex: `^${q}`, $options: 'i' } }).select('name email');
        return res.json({ success: true, users });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Search failed' });
    }
});

// Send join request by email
router.post('/:teamId/invite', isAuthenticated, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { receiverEmail } = req.body;
        const team = await Team.findById(teamId).populate('tournament');
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        if (team.leader.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only team leader can invite' });
        }
        // Enforce max members from tournament config
        const maxMembers = team.tournament?.format?.playersPerTeam || 0;
        if (maxMembers > 0 && team.members.length >= maxMembers) {
            return res.status(400).json({ success: false, message: 'Team member limit reached' });
        }
        const jr = await JoinRequest.create({ sender: req.user._id, receiverEmail, team: team._id, tournament: team.tournament._id });
        return res.status(201).json({ success: true, request: jr });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to send request' });
    }
});

// Get organizing team for a tournament
router.get('/organizing/:tournamentId', isAuthenticated, async (req, res) => {
    try {
        const { tournamentId } = req.params;
        // primary: explicit organizing flag
        let team = await Team.findOne({ tournament: tournamentId, isOrganizing: true })
            .populate('leader', 'name email')
            .populate('members.user', 'name email');
        // fallback for teams created before isOrganizing flag: leader == tournament.organizer
        if (!team) {
            const t = await Tournament.findById(tournamentId).select('organizer');
            if (t) {
                team = await Team.findOne({ tournament: tournamentId, leader: t.organizer })
                    .populate('leader', 'name email')
                    .populate('members.user', 'name email');
            }
        }
        if (!team) return res.json({ success: true, team: null });
        return res.json({ success: true, team });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to fetch organizing team' });
    }
});

// Get my team for a tournament (non-organizing)
router.get('/my-team/:tournamentId', isAuthenticated, async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user._id;
        const team = await Team.findOne({
            tournament: tournamentId,
            isOrganizing: false,
            $or: [
                { leader: userId },
                { 'members.user': userId }
            ]
        })
        .populate('leader', 'name email')
        .populate('members.user', 'name email')
        .populate('tournament', 'name format registrationDeadline participantsLimit currentParticipants status');
        return res.json({ success: true, team });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to load my team' });
    }
});

// Remove a member (leader or tournament organizer only)
router.post('/:teamId/remove-member', isAuthenticated, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { memberUserId } = req.body;
        const team = await Team.findById(teamId).populate('tournament');
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        const isLeader = team.leader.toString() === req.user._id.toString();
        const isOrganizer = team.tournament.organizer.toString() === req.user._id.toString();
        if (!isLeader && !isOrganizer) return res.status(403).json({ success: false, message: 'Not authorized' });
        // Do not allow removing the team leader or the tournament organizer (including self)
        if (memberUserId && (
            memberUserId.toString() === team.leader.toString() ||
            memberUserId.toString() === team.tournament.organizer.toString()
        )) {
            return res.status(400).json({ success: false, message: 'Cannot remove the team leader or tournament organizer' });
        }
        await Team.findByIdAndUpdate(teamId, { $pull: { members: { user: memberUserId } } });
        const updated = await Team.findById(teamId).populate('leader', 'name email').populate('members.user', 'name email');
        return res.json({ success: true, team: updated });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to remove member' });
    }
});

// Rename team (ensure unique within tournament)
router.put('/:teamId/rename', isAuthenticated, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { newName } = req.body;
        if (!newName || !newName.trim()) return res.status(400).json({ success: false, message: 'New name required' });
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        const isLeader = team.leader.toString() === req.user._id.toString();
        if (!isLeader) return res.status(403).json({ success: false, message: 'Only team leader can rename team' });
        const dup = await Team.findOne({ tournament: team.tournament, name: newName.trim(), _id: { $ne: team._id } });
        if (dup) return res.status(409).json({ success: false, message: 'A team with this name already exists in this tournament' });
        team.name = newName.trim();
        await team.save();
        const updated = await Team.findById(teamId).populate('leader', 'name email').populate('members.user', 'name email');
        return res.json({ success: true, team: updated });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to rename team' });
    }
});

// Directly add a member by email (leader or tournament organizer only)
router.post('/:teamId/add-member', isAuthenticated, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { userEmail, role } = req.body;
        const team = await Team.findById(teamId).populate('tournament');
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        const isLeader = team.leader.toString() === req.user._id.toString();
        const isOrganizer = team.tournament.organizer.toString() === req.user._id.toString();
        if (!isLeader && !isOrganizer) return res.status(403).json({ success: false, message: 'Not authorized' });
        // Enforce max members from tournament config
        const maxMembers = team.tournament?.format?.playersPerTeam || 0;
        if (maxMembers > 0 && team.members.length >= maxMembers) {
            return res.status(400).json({ success: false, message: 'Team member limit reached' });
        }
        const user = await User.findOne({ email: userEmail });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const exists = team.members.some(m => m.user.toString() === user._id.toString());
        if (exists) return res.status(400).json({ success: false, message: 'User already a member' });
        await Team.findByIdAndUpdate(teamId, { $addToSet: { members: { user: user._id, role: role || 'member' } } });
        const updated = await Team.findById(teamId).populate('leader', 'name email').populate('members.user', 'name email');
        return res.json({ success: true, team: updated });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to add member' });
    }
});

// Accept or reject by receiver email
router.post('/requests/:requestId/respond', isAuthenticated, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action } = req.body; // 'accepted' | 'rejected'
        const request = await JoinRequest.findById(requestId).populate('team').populate('tournament');
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        if (request.receiverEmail.toLowerCase() !== req.user.email.toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Not authorized for this request' });
        }
        if (!['accepted', 'rejected'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }
        request.status = action;
        await request.save();
        if (action === 'accepted') {
            // Enforce max members before adding
            const team = await Team.findById(request.team).populate('tournament');
            if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
            const maxMembers = team.tournament?.format?.playersPerTeam || 0;
            if (maxMembers > 0 && team.members.length >= maxMembers) {
                return res.status(400).json({ success: false, message: 'Team member limit reached' });
            }
            const alreadyMember = team.members.some(m => m.user.toString() === req.user._id.toString());
            if (!alreadyMember) {
                await Team.findByIdAndUpdate(request.team, { $addToSet: { members: { user: req.user._id, role: 'member' } } });
            }
        }
        return res.json({ success: true, request });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to respond to request' });
    }
});

// Get my pending requests (Messages)
router.get('/my-requests', isAuthenticated, async (req, res) => {
    try {
        const requests = await JoinRequest.find({ receiverEmail: req.user.email, status: 'pending' })
            .populate('team', 'name')
            .populate('sender', 'name email');
        return res.json({ success: true, requests });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to fetch requests' });
    }
});

// Count unread pending requests for current user
router.get('/my-requests/unread-count', isAuthenticated, async (req, res) => {
    try {
        const count = await JoinRequest.countDocuments({ receiverEmail: req.user.email, status: 'pending', isRead: false });
        return res.json({ success: true, count });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to count unread requests' });
    }
});

// Mark all my pending requests as read
router.post('/my-requests/mark-read', isAuthenticated, async (req, res) => {
    try {
        const result = await JoinRequest.updateMany(
            { receiverEmail: req.user.email, status: 'pending', isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );
        return res.json({ success: true, modified: result.modifiedCount });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to mark requests as read' });
    }
});

export default router;


