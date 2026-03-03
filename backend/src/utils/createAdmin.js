const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function createAdminUser() {
    try {
        // First, check if admin already exists
        const checkAdmin = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            ['admin']
        );

        if (checkAdmin.rows.length > 0) {
            console.log('Admin user already exists. Updating password...');
            
            // Hash the password
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            // Update existing admin
            await pool.query(
                'UPDATE users SET password_hash = $1 WHERE username = $2',
                [hashedPassword, 'admin']
            );
            
            console.log('Admin password updated successfully!');
        } else {
            // Hash the password
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            // Insert new admin user
            const result = await pool.query(
                `INSERT INTO users (username, password_hash, email, full_name, role_id, is_active) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id, username, email, full_name, role_id`,
                ['admin', hashedPassword, 'admin@restaurant.com', 'System Admin', 1, true]
            );
            
            console.log('Admin user created successfully:', result.rows[0]);
        }

        // Verify the password works
        const verifyUser = await pool.query(
            'SELECT password_hash FROM users WHERE username = $1',
            ['admin']
        );
        
        const isValid = await bcrypt.compare('admin123', verifyUser.rows[0].password_hash);
        console.log('Password verification:', isValid ? '✅ Success' : '❌ Failed');

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await pool.end();
    }
}

createAdminUser();
