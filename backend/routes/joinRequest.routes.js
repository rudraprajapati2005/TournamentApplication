import express from 'express';
import JoinRequest from '../models/JoinRequest.model.js';
import Team from '../models/Team.model.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

// Leader view: requests sent for my team
router.get('/team/:teamId', isAuthenticated, async (req, res) => {
    try {
        const { teamId } = req.params;
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        if (team.leader.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only team leader can view' });
        }
        const requests = await JoinRequest.find({ team: teamId }).sort({ createdAt: -1 });
        return res.json({ success: true, requests });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to fetch requests' });
    }
});

export default router;


