const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { validationResult } = require('express-validator');

const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { username, password } = req.body;

        // Get user with role information
        const result = await db.query(
            `SELECT u.*, r.name as role_name, r.description as role_description 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.username = $1 AND u.is_active = true`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        const user = result.rows[0];

        // Compare password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role_id 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        // Update last login
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES ($1, $2, $3, $4)',
            [user.id, 'LOGIN', 'user', JSON.stringify({ username: user.username })]
        );

        // Remove password hash from response
        delete user.password_hash;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user,
                token,
                expiresIn: process.env.JWT_EXPIRE
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { username, password, email, full_name, role_id } = req.body;

        // Check if user exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username or email already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS));

        // Insert new user
        const result = await db.query(
            `INSERT INTO users (username, password_hash, email, full_name, role_id) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, username, email, full_name, role_id, created_at`,
            [username, hashedPassword, email, full_name, role_id || 4] // Default to waiter role
        );

        const newUser = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: newUser
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

const logout = async (req, res) => {
    try {
        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'LOGOUT', 'user', JSON.stringify({ username: req.user.username })]
        );

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

const getProfile = async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

module.exports = {
    login,
    register,
    logout,
    getProfile
};
