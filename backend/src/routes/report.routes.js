const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize, ROLES } = require('../middleware/auth');

// Daily sales report
router.get('/daily-sales', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
    try {
        const { date } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];
        
        const result = await db.query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_orders,
                SUM(total_amount) as total_revenue,
                SUM(tax) as total_tax,
                AVG(total_amount) as average_order_value,
                COUNT(DISTINCT waiter_id) as active_staff,
                SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) as cash_payments,
                SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END) as card_payments,
                SUM(CASE WHEN payment_method = 'upi' THEN total_amount ELSE 0 END) as upi_payments
             FROM orders
             WHERE DATE(created_at) = $1 AND payment_status = 'paid'
             GROUP BY DATE(created_at)`,
            [reportDate]
        );
        
        // Get top selling items
        const topItems = await db.query(
            `SELECT 
                mi.name,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.subtotal) as total_revenue
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             JOIN menu_items mi ON oi.menu_item_id = mi.id
             WHERE DATE(o.created_at) = $1 AND o.payment_status = 'paid'
             GROUP BY mi.name
             ORDER BY total_quantity DESC
             LIMIT 10`,
            [reportDate]
        );
        
        res.json({
            success: true,
            data: {
                summary: result.rows[0] || {
                    date: reportDate,
                    total_orders: 0,
                    total_revenue: 0,
                    total_tax: 0,
                    average_order_value: 0,
                    active_staff: 0,
                    cash_payments: 0,
                    card_payments: 0,
                    upi_payments: 0
                },
                top_items: topItems.rows
            }
        });
    } catch (error) {
        console.error('Daily sales report error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Monthly sales report
router.get('/monthly-sales', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
    try {
        const { year, month } = req.query;
        const currentDate = new Date();
        const reportYear = year || currentDate.getFullYear();
        const reportMonth = month || currentDate.getMonth() + 1;
        
        const result = await db.query(
            `SELECT 
                DATE_TRUNC('day', created_at) as day,
                COUNT(*) as orders,
                SUM(total_amount) as revenue
             FROM orders
             WHERE EXTRACT(YEAR FROM created_at) = $1 
               AND EXTRACT(MONTH FROM created_at) = $2
               AND payment_status = 'paid'
             GROUP BY DATE_TRUNC('day', created_at)
             ORDER BY day`,
            [reportYear, reportMonth]
        );
        
        // Get monthly summary
        const summary = await db.query(
            `SELECT 
                COUNT(*) as total_orders,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as avg_order_value,
                COUNT(DISTINCT customer_id) as unique_customers
             FROM orders
             WHERE EXTRACT(YEAR FROM created_at) = $1 
               AND EXTRACT(MONTH FROM created_at) = $2
               AND payment_status = 'paid'`,
            [reportYear, reportMonth]
        );
        
        res.json({
            success: true,
            data: {
                year: reportYear,
                month: reportMonth,
                daily_breakdown: result.rows,
                summary: summary.rows[0]
            }
        });
    } catch (error) {
        console.error('Monthly sales report error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Inventory report
router.get('/inventory', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
    try {
        // Current inventory status
        const inventory = await db.query(
            `SELECT 
                i.*,
                s.name as supplier_name,
                CASE 
                    WHEN i.quantity <= i.reorder_level THEN 'Low Stock'
                    WHEN i.quantity <= i.reorder_level * 2 THEN 'Medium Stock'
                    ELSE 'Good Stock'
                END as stock_status
             FROM inventory i
             LEFT JOIN suppliers s ON i.supplier_id = s.id
             ORDER BY 
                CASE 
                    WHEN i.quantity <= i.reorder_level THEN 1
                    WHEN i.quantity <= i.reorder_level * 2 THEN 2
                    ELSE 3
                END,
                i.item_name`
        );
        
        // Summary statistics
        const summary = await db.query(
            `SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN quantity <= reorder_level THEN 1 ELSE 0 END) as low_stock_items,
                SUM(quantity * unit_cost) as total_inventory_value
             FROM inventory`
        );
        
        // Recent purchases
        const recentPurchases = await db.query(
            `SELECT 
                p.*,
                i.item_name,
                s.name as supplier_name
             FROM purchases p
             JOIN inventory i ON p.inventory_id = i.id
             JOIN suppliers s ON p.supplier_id = s.id
             ORDER BY p.purchase_date DESC
             LIMIT 20`
        );
        
        res.json({
            success: true,
            data: {
                inventory: inventory.rows,
                summary: summary.rows[0],
                recent_purchases: recentPurchases.rows
            }
        });
    } catch (error) {
        console.error('Inventory report error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Staff performance report
router.get('/staff-performance', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        const result = await db.query(
            `SELECT 
                u.id,
                u.username,
                u.full_name,
                r.name as role,
                COUNT(DISTINCT o.id) as orders_taken,
                SUM(o.total_amount) as total_sales,
                AVG(o.total_amount) as avg_order_value,
                COUNT(DISTINCT DATE(o.created_at)) as days_worked
             FROM users u
             JOIN roles r ON u.role_id = r.id
             LEFT JOIN orders o ON u.id = o.waiter_id
                AND ($1::date IS NULL OR o.created_at >= $1::date)
                AND ($2::date IS NULL OR o.created_at <= $2::date)
                AND o.payment_status = 'paid'
             WHERE u.role_id IN (4, 3) -- Waiters and Cashiers
             GROUP BY u.id, u.username, u.full_name, r.name
             ORDER BY total_sales DESC`,
            [start_date || null, end_date || null]
        );
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Staff performance report error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

module.exports = router;
