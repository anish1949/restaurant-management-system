const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
require('dotenv').config();

async function createAdmin() {
    try {
        const username = 'admin';
        const password = 'admin123';
        const email = 'admin@restaurant.com';
        const fullName = 'System Admin';
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS));
        
        // Check if admin already exists
        const checkResult = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        
        if (checkResult.rows.length > 0) {
            console.log('Admin user already exists. Updating password...');
            
            // Update existing admin
            await pool.query(
                'UPDATE users SET password_hash = $1 WHERE username = $2',
                [hashedPassword, username]
            );
            
            console.log('Admin password updated successfully!');
        } else {
            // Insert new admin
            const result = await pool.query(
                `INSERT INTO users (username, password_hash, email, full_name, role_id, is_active) 
                 VALUES ($1, $2, $3, $4, 1, true) 
                 RETURNING id, username, email, full_name`,
                [username, hashedPassword, email, fullName]
            );
            
            console.log('Admin user created successfully:', result.rows[0]);
        }
        
        console.log('\nAdmin credentials:');
        console.log('Username: admin');
        console.log('Password: admin123');
        
    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await pool.end();
    }
}

createAdmin();
