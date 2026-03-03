const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize, ROLES } = require('../middleware/auth');

// Get daily sales summary
router.get('/daily-sales', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT * FROM daily_sales 
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (start_date) {
            query += ` AND sale_date >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND sale_date <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }
        
        query += ' ORDER BY sale_date DESC';
        
        const result = await db.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get daily sales error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get expense categories
router.get('/expense-categories', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM expense_categories ORDER BY name');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get expense categories error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get expenses
router.get('/expenses', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
    try {
        const { start_date, end_date, category_id } = req.query;
        
        let query = `
            SELECT e.*, 
                   c.name as category_name,
                   u.full_name as created_by_name,
                   a.full_name as approved_by_name
            FROM expenses e
            LEFT JOIN expense_categories c ON e.category_id = c.id
            LEFT JOIN users u ON e.created_by = u.id
            LEFT JOIN users a ON e.approved_by = a.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (start_date) {
            query += ` AND e.expense_date >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND e.expense_date <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }

        if (category_id) {
            query += ` AND e.category_id = $${paramIndex}`;
            params.push(category_id);
            paramIndex++;
        }
        
        query += ' ORDER BY e.expense_date DESC';
        
        const result = await db.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Create expense
router.post('/expenses', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
    try {
        const { 
            category_id, amount, description, expense_date, 
            payment_method, receipt_url, notes 
        } = req.body;
        
        const result = await db.query(
            `INSERT INTO expenses (
                category_id, amount, description, expense_date, 
                payment_method, receipt_url, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [category_id, amount, description, expense_date, 
             payment_method, receipt_url, notes, req.user.id]
        );
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Approve expense
router.patch('/expenses/:id/approve', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            `UPDATE expenses 
             SET approved_by = $1 
             WHERE id = $2 RETURNING *`,
            [req.user.id, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Approve expense error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get payment methods
router.get('/payment-methods', authenticate, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM payment_methods WHERE is_active = true ORDER BY name');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get payment methods error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get profit & loss report
router.get('/profit-loss', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        // Calculate total revenue
        const revenueResult = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) as total_revenue
            FROM orders
            WHERE payment_status = 'paid'
              AND ($1::date IS NULL OR created_at >= $1::date)
              AND ($2::date IS NULL OR created_at <= $2::date)
        `, [start_date || null, end_date || null]);
        
        // Calculate total expenses
        const expenseResult = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total_expenses
            FROM expenses
            WHERE ($1::date IS NULL OR expense_date >= $1::date)
              AND ($2::date IS NULL OR expense_date <= $2::date)
        `, [start_date || null, end_date || null]);
        
        // Calculate food cost (from inventory transactions)
        const foodCostResult = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) as food_cost
            FROM inventory_transactions
            WHERE transaction_type = 'sale'
              AND ($1::date IS NULL OR created_at >= $1::date)
              AND ($2::date IS NULL OR created_at <= $2::date)
        `, [start_date || null, end_date || null]);
        
        // Calculate labor cost (from staff time tracking)
        const laborCostResult = await db.query(`
            SELECT COALESCE(SUM(u.hourly_rate * t.total_hours), 0) as labor_cost
            FROM staff_time_tracking t
            JOIN users u ON t.user_id = u.id
            WHERE t.status = 'completed'
              AND ($1::date IS NULL OR DATE(t.clock_in) >= $1::date)
              AND ($2::date IS NULL OR DATE(t.clock_in) <= $2::date)
        `, [start_date || null, end_date || null]);
        
        const revenue = parseFloat(revenueResult.rows[0].total_revenue);
        const expenses = parseFloat(expenseResult.rows[0].total_expenses);
        const foodCost = parseFloat(foodCostResult.rows[0].food_cost);
        const laborCost = parseFloat(laborCostResult.rows[0].labor_cost);
        
        const grossProfit = revenue - foodCost - laborCost;
        const netProfit = revenue - expenses;
        const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
        
        res.json({
            success: true,
            data: {
                revenue,
                expenses,
                food_cost: foodCost,
                labor_cost: laborCost,
                gross_profit: grossProfit,
                net_profit: netProfit,
                profit_margin: profitMargin.toFixed(2)
            }
        });
    } catch (error) {
        console.error('Get profit loss error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Generate daily sales summary (cron job or manual trigger)
router.post('/generate-daily-summary', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
    try {
        const { date } = req.body;
        const summaryDate = date || new Date().toISOString().split('T')[0];
        
        // Get orders for the day
        const ordersResult = await db.query(`
            SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(tax), 0) as total_tax,
                COALESCE(AVG(total_amount), 0) as average_order_value,
                COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_amount,
                COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_amount,
                COALESCE(SUM(CASE WHEN payment_method = 'upi' THEN total_amount ELSE 0 END), 0) as mobile_amount
            FROM orders
            WHERE DATE(created_at) = $1 AND payment_status = 'paid'
        `, [summaryDate]);
        
        const orders = ordersResult.rows[0];
        
        // Calculate labor cost for the day
        const laborResult = await db.query(`
            SELECT COALESCE(SUM(u.hourly_rate * t.total_hours), 0) as labor_cost
            FROM staff_time_tracking t
            JOIN users u ON t.user_id = u.id
            WHERE DATE(t.clock_in) = $1 AND t.status = 'completed'
        `, [summaryDate]);
        
        // Calculate food cost for the day
        const foodResult = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) as food_cost
            FROM inventory_transactions
            WHERE DATE(created_at) = $1 AND transaction_type = 'sale'
        `, [summaryDate]);
        
        // Insert or update daily summary
        const result = await db.query(
            `INSERT INTO daily_sales (
                sale_date, total_orders, total_revenue, total_tax,
                cash_amount, card_amount, mobile_amount,
                average_order_value, labor_cost, food_cost,
                profit
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (sale_date) 
            DO UPDATE SET
                total_orders = EXCLUDED.total_orders,
                total_revenue = EXCLUDED.total_revenue,
                total_tax = EXCLUDED.total_tax,
                cash_amount = EXCLUDED.cash_amount,
                card_amount = EXCLUDED.card_amount,
                mobile_amount = EXCLUDED.mobile_amount,
                average_order_value = EXCLUDED.average_order_value,
                labor_cost = EXCLUDED.labor_cost,
                food_cost = EXCLUDED.food_cost,
                profit = EXCLUDED.profit,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [
                summaryDate,
                orders.total_orders,
                orders.total_revenue,
                orders.total_tax,
                orders.cash_amount,
                orders.card_amount,
                orders.mobile_amount,
                orders.average_order_value,
                laborResult.rows[0].labor_cost,
                foodResult.rows[0].food_cost,
                orders.total_revenue - laborResult.rows[0].labor_cost - foodResult.rows[0].food_cost
            ]
        );
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Generate daily summary error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
