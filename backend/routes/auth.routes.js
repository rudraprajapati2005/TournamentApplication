
// ...existing routes...

// PUT /auth/profile (update profile)

// Routes for creating the ENDPOINTS ( API )
import express from 'express';
import User from '../models/User.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';

const router = express.Router();
// POST /api/signup
// Registration route for frontend
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get("/google/callback",
  passport.authenticate("google", {
    successRedirect: process.env.CLIENT_URL+ "/dashboard",
    failureRedirect: "/login/failed",
})
);

router.put('/profile', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated with user' });
  }
  try {

    console.log("Current session user:", req.user);
    console.log("Received update data:", req.body);
    
    // Only include fields that were sent in the request
    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.profilePic !== undefined) updateData.profilePic = req.body.profilePic;
    if (req.body.gender !== undefined) updateData.gender = req.body.gender;
    if (req.body.dob !== undefined) updateData.dob = new Date(req.body.dob);

    console.log("Update data being applied:", updateData);

    // First get the current user data
    const currentUser = await User.findById(req.user._id).lean();
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Merge the update data with current user data
    const mergedUpdate = {
      ...currentUser,
      ...updateData
    };

    // Update and fetch the user with populated data
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    )
    .populate({
      path: 'participations',
      populate: [
        {
          path: 'tournament',
          select: 'name date location status format sportType'
        },
        {
          path: 'matches',
          select: 'matchDate status score round'
        }
      ]
    })
    .lean();

    console.log("User after database update:", updatedUser);

    // Format the user data consistently with login/success
    const formattedUser = {
      ...updatedUser,
      dob: updatedUser.dob ? new Date(updatedUser.dob).toISOString() : undefined,
      timestamp: updatedUser.timestamp ? new Date(updatedUser.timestamp).toISOString() : undefined,
      
      // Group participations by tournament type with safety checks
      participationSummary: {
        singleTournaments: (updatedUser.participations || [])
          .filter(p => p && p.tournament && p.tournament.format && p.tournament.format.type === 'single'),
        teamTournaments: (updatedUser.participations || [])
          .filter(p => p && p.tournament && p.tournament.format && p.tournament.format.type === 'team'),
        stats: {
          totalMatches: (updatedUser.participations || [])
            .reduce((acc, p) => acc + (p ? (p.matchesPlayed || 0) : 0), 0),
          totalWins: (updatedUser.participations || [])
            .reduce((acc, p) => acc + (p ? (p.matchesWon || 0) : 0), 0),
          activeTournaments: (updatedUser.participations || [])
            .filter(p => p && p.status === 'active').length
        }
      }
    };

    // Update the session
    req.user = formattedUser;
    
    // Save the session explicitly
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("Failed to save session:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log("Final user in session:", req.user);
    res.json({ success: true, user: formattedUser });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
});


router.get('/login/success', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Fetch user with all related data
    const user = await User.findById(req.user._id)
      .populate({
        path: 'participations',
        populate: [
          {
            path: 'tournament',
            select: 'name date location status format sportType'
          },
          {
            path: 'matches',
            select: 'matchDate status score round'
          }
        ]
      })
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Format dates and handle participations
    const formattedUser = {
      ...user,
      dob: user.dob ? new Date(user.dob).toISOString() : undefined,
      timestamp: user.timestamp ? new Date(user.timestamp).toISOString() : undefined,
      
      // Group participations by tournament type with safety checks
      participationSummary: {
        singleTournaments: (user.participations || [])
          .filter(p => p && p.tournament && p.tournament.format && p.tournament.format.type === 'single'),
        teamTournaments: (user.participations || [])
          .filter(p => p && p.tournament && p.tournament.format && p.tournament.format.type === 'team'),
        stats: {
          totalMatches: (user.participations || [])
            .reduce((acc, p) => acc + (p ? (p.matchesPlayed || 0) : 0), 0),
          totalWins: (user.participations || [])
            .reduce((acc, p) => acc + (p ? (p.matchesWon || 0) : 0), 0),
          activeTournaments: (user.participations || [])
            .filter(p => p && p.status === 'active').length
        }
      }
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: formattedUser,
    });
  } catch (err) {
    console.error('Error in login/success:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});

router.get('/login/failed', (req, res) => {
  res.status(401).json({  
    error: true,
    message: 'Login failed',
  });
});

// Local login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email, authProvider: 'local' });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Create session
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Login failed. Please try again.'
        });
      }

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider
        }
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

//logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed', error: err?.message });
    }

    // Destroy the session, then clear the cookie and send response
    req.session.destroy((destroyErr) => {
      // Always attempt to clear cookie on the response
      res.clearCookie('connect.sid', { path: '/' });

      if (destroyErr) {
        return res.status(500).json({ success: false, message: 'Session destruction failed', error: destroyErr?.message });
      }

      return res.status(200).json({ success: true, message: 'Logout successful' });
    });
  });
});

router.post('/register', async (req, res) => {
  console.log("Received registration request:", req.body);
  const { name, email, password, role } = req.body;
  
  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Name, email, and password are required' 
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please enter a valid email address' 
    });
  }

  // Password length validation
  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password must be at least 6 characters long' 
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered. Please use a different email or try logging in.' 
      });
    }

    const newUser = await User.create({ 
      name, 
      email, 
      password, 
      role: role || 'participant',
      authProvider: 'local'
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Registration successful! You can now log in.' 
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed. Please try again.' 
    });
  }
});

export default router;