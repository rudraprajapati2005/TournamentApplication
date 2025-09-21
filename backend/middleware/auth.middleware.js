// Middleware to check if user is authenticated
export const isAuthenticated = (req, res, next) => {
    // Check if user is authenticated via session
    if (req.isAuthenticated()) {
        return next();
    }
    
    // If not authenticated, return error
    res.status(401).json({
        success: false,
        message: 'You must be logged in to perform this action'
    });
};

// Middleware to check if user has specific role
export const hasRole = (roles) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                success: false,
                message: 'You must be logged in to perform this action'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action'
            });
        }

        next();
    };
};

// Middleware to check if user is organizer
export const isOrganizer = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: 'You must be logged in to perform this action'
        });
    }

    if (req.user.role !== 'Organizer') {
        return res.status(403).json({
            success: false,
            message: 'You must be an organizer to perform this action'
        });
    }

    next();
};

// Middleware to check if user is participant
export const isParticipant = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: 'You must be logged in to perform this action'
        });
    }

    if (req.user.role !== 'participant') {
        return res.status(403).json({
            success: false,
            message: 'You must be a participant to perform this action'
        });
    }

    next();
};
