import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Tournament from '../models/Tournament.model.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();
const { Schema } = mongoose;

// Route to switch user role between participant and organizer
router.post('/switch-role', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId)
            .populate({
                path: 'participatedTournaments',
                select: 'status'
            });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check current role and conditions for switching
        if (user.role === 'participant') {
            // Check if user has any ongoing matches/tournaments
            const hasOngoingTournaments = user.participatedTournaments.some(
                tournament => tournament.status === 'ongoing'
            );

            if (hasOngoingTournaments) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot switch to Organizer role while having ongoing tournaments'
                });
            }

            // Switch to Organizer
            user.role = 'Organizer';
        } else if (user.role === 'Organizer') {
            // Find tournaments organized by this user
            const organizedTournaments = await Tournament.find({
                organizer: userId,
                status: { $in: ['upcoming', 'ongoing'] }
            });

            if (organizedTournaments.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot switch to participant role while having active or upcoming tournaments as organizer'
                });
            }

            // Switch to participant
            user.role = 'participant';
        }

        await user.save();

        res.json({
            success: true,
            message: `Successfully switched role to ${user.role}`,
            newRole: user.role
        });

    } catch (error) {
        console.error('Error switching role:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while switching role'
        });
    }
});

// Route to check if user can switch roles
router.get('/can-switch-role', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId)
            .populate({
                path: 'participatedTournaments',
                select: 'status'
            });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let canSwitch = true;
        let reason = '';

        if (user.role === 'participant') {
            const hasOngoingTournaments = user.participatedTournaments.some(
                tournament => tournament.status === 'ongoing'
            );

            if (hasOngoingTournaments) {
                canSwitch = false;
                reason = 'You have ongoing tournaments. Complete or withdraw from them first.';
            }
        } else if (user.role === 'Organizer') {
            const organizedTournaments = await Tournament.find({
                organizer: userId,
                status: { $in: ['upcoming', 'ongoing'] }
            });

            if (organizedTournaments.length > 0) {
                canSwitch = false;
                reason = 'You have active or upcoming tournaments as organizer. Complete or cancel them first.';
            }
        }

        res.json({
            success: true,
            canSwitch,
            currentRole: user.role,
            reason: reason || null
        });

    } catch (error) {
        console.error('Error checking role switch eligibility:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while checking role switch eligibility'
        });
    }
});

export default router;
