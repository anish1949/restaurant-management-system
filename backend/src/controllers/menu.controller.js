const db = require('../config/database');

const getAllCategories = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM menu_categories WHERE is_active = true ORDER BY display_order'
        );
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name, description, display_order } = req.body;
        
        const result = await db.query(
            'INSERT INTO menu_categories (name, description, display_order) VALUES ($1, $2, $3) RETURNING *',
            [name, description, display_order]
        );

        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'CREATE_CATEGORY', 'menu_category', result.rows[0].id, JSON.stringify({ name })]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

const getAllMenuItems = async (req, res) => {
    try {
        const { category, available } = req.query;
        
        let query = `
            SELECT mi.*, mc.name as category_name 
            FROM menu_items mi
            JOIN menu_categories mc ON mi.category_id = mc.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (category) {
            query += ` AND mc.id = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (available === 'true') {
            query += ` AND mi.is_available = true`;
        }

        query += ' ORDER BY mc.display_order, mi.name';

        const result = await db.query(query, params);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get menu items error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

const createMenuItem = async (req, res) => {
    try {
        const { 
            category_id, name, description, price, 
            cost, image_url, is_vegetarian, preparation_time 
        } = req.body;
        
        const result = await db.query(
            `INSERT INTO menu_items 
             (category_id, name, description, price, cost, image_url, is_vegetarian, preparation_time) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [category_id, name, description, price, cost, image_url, is_vegetarian, preparation_time]
        );

        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'CREATE_MENU_ITEM', 'menu_item', result.rows[0].id, JSON.stringify({ name, price })]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Build dynamic update query
        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
        
        const values = [id, ...Object.values(updates)];
        
        const result = await db.query(
            `UPDATE menu_items SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Menu item not found' 
            });
        }

        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'UPDATE_MENU_ITEM', 'menu_item', id, JSON.stringify(updates)]
        );

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update menu item error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

const toggleAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            'UPDATE menu_items SET is_available = NOT is_available, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_available',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Menu item not found' 
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Toggle availability error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

module.exports = {
    getAllCategories,
    createCategory,
    getAllMenuItems,
    createMenuItem,
    updateMenuItem,
    toggleAvailability
};
