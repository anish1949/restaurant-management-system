const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db.query(
            'SELECT id, username, email, full_name, role_id FROM users WHERE id = $1 AND is_active = true',
            [decoded.id]
        );

        if (user.rows.length === 0) {
            throw new Error();
        }

        req.user = user.rows[0];
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'Please authenticate' 
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        // Check if user's role is allowed
        const hasRole = roles.includes(req.user.role_id);
        
        if (!hasRole) {
            return res.status(403).json({ 
                success: false, 
                message: 'Insufficient permissions' 
            });
        }
        
        next();
    };
};

// Role constants for easy reference
const ROLES = {
    ADMIN: 1,
    MANAGER: 2,
    CASHIER: 3,
    WAITER: 4,
    KITCHEN: 5
};

module.exports = { authenticate, authorize, ROLES };
