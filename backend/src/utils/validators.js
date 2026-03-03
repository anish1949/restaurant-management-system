const { body, param, query } = require('express-validator');

const validators = {
    // Auth validators
    login: [
        body('username').notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],

    register: [
        body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('full_name').optional().isString().withMessage('Full name must be string')
    ],

    // Menu validators
    createCategory: [
        body('name').notEmpty().withMessage('Category name is required'),
        body('description').optional().isString(),
        body('display_order').optional().isInt({ min: 0 }).withMessage('Display order must be positive')
    ],

    createMenuItem: [
        body('category_id').isInt().withMessage('Valid category ID is required'),
        body('name').notEmpty().withMessage('Item name is required'),
        body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
        body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be positive'),
        body('is_vegetarian').optional().isBoolean(),
        body('preparation_time').optional().isInt({ min: 0 }).withMessage('Preparation time must be positive')
    ],

    // Order validators
    createOrder: [
        body('table_id').optional().isInt(),
        body('customer_id').optional().isInt(),
        body('order_type').isIn(['dine-in', 'takeaway', 'delivery']).withMessage('Invalid order type'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        body('items.*.menu_item_id').isInt(),
        body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('special_instructions').optional().isString()
    ],

    updateOrderStatus: [
        param('id').isInt().withMessage('Valid order ID is required'),
        body('status').isIn(['pending', 'preparing', 'ready', 'served', 'paid', 'cancelled'])
            .withMessage('Invalid status')
    ],

    // Table validators
    createTable: [
        body('table_number').isInt({ min: 1 }).withMessage('Valid table number is required'),
        body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
        body('location').optional().isString()
    ],

    updateTableStatus: [
        param('id').isInt().withMessage('Valid table ID is required'),
        body('status').isIn(['available', 'occupied', 'reserved', 'maintenance'])
            .withMessage('Invalid status')
    ],

    // Inventory validators
    createInventoryItem: [
        body('item_name').notEmpty().withMessage('Item name is required'),
        body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be positive'),
        body('unit').notEmpty().withMessage('Unit is required'),
        body('reorder_level').optional().isFloat({ min: 0 }),
        body('unit_cost').optional().isFloat({ min: 0 })
    ],

    updateInventoryQuantity: [
        param('id').isInt().withMessage('Valid inventory ID is required'),
        body('quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
        body('operation').isIn(['add', 'subtract']).withMessage('Operation must be add or subtract')
    ],

    // ID param validator
    idParam: [
        param('id').isInt().withMessage('Valid ID is required')
    ],

    // Date range validator
    dateRange: [
        query('start_date').optional().isDate().withMessage('Valid start date is required'),
        query('end_date').optional().isDate().withMessage('Valid end date is required')
            .custom((endDate, { req }) => {
                if (req.query.start_date && endDate < req.query.start_date) {
                    throw new Error('End date must be after start date');
                }
                return true;
            })
    ]
};

module.exports = validators;
