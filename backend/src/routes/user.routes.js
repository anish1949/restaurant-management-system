const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize, ROLES } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.last_login, u.created_at,
                    r.name as role_name, r.description as role_description
             FROM users u
             JOIN roles r ON u.role_id = r.id
             ORDER BY u.created_at DESC`
        );
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if user is requesting their own data or is admin
        if (req.user.id !== parseInt(id) && req.user.role_id !== ROLES.ADMIN) {
            return res.status(403).json({ 
                success: false, 
                message: 'Unauthorized to view this user' 
            });
        }

        const result = await db.query(
            `SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.last_login, u.created_at,
                    r.name as role_name, r.description as role_description
             FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE u.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Update user
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email } = req.body;
        
        // Check if user is updating their own data or is admin
        if (req.user.id !== parseInt(id) && req.user.role_id !== ROLES.ADMIN) {
            return res.status(403).json({ 
                success: false, 
                message: 'Unauthorized to update this user' 
            });
        }

        const result = await db.query(
            `UPDATE users 
             SET full_name = COALESCE($1, full_name),
                 email = COALESCE($2, email),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING id, username, email, full_name, role_id`,
            [full_name, email, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'UPDATE_USER', 'user', id, JSON.stringify(req.body)]
        );

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Toggle user active status (admin only)
router.patch('/:id/toggle-status', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, username, is_active',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

module.exports = router;
