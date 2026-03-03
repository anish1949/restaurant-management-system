-- Insert roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access'),
    ('manager', 'Can manage operations but not system settings'),
    ('cashier', 'Can handle payments and basic orders'),
    ('waiter', 'Can take orders and serve'),
    ('kitchen', 'Can view and update order preparation status');

-- Insert admin user (password: admin123 - we'll hash this in the app)
    ('admin', '$2b$10$YourHashedPasswordHere', 'admin@restaurant.com', 'System Admin', 1, true);

-- Insert sample tables
INSERT INTO tables (table_number, capacity, location) VALUES
    (1, 2, 'Window'),
    (2, 4, 'Center'),
    (3, 4, 'Center'),
    (4, 6, 'Corner'),
    (5, 8, 'Private'),
    (6, 2, 'Outdoor'),
    (7, 4, 'Outdoor'),
    (8, 2, 'Bar');

-- Insert menu categories
INSERT INTO menu_categories (name, description, display_order) VALUES
    ('Appetizers', 'Start your meal right', 1),
    ('Main Course', 'Signature dishes', 2),
    ('Beverages', 'Drinks and refreshments', 3),
    ('Desserts', 'Sweet endings', 4);

-- Insert sample menu items
INSERT INTO menu_items (category_id, name, description, price, cost, is_vegetarian, preparation_time) VALUES
    (1, 'Spring Rolls', 'Crispy vegetable rolls', 8.99, 3.50, true, 10),
    (1, 'Chicken Wings', 'Spicy grilled wings', 12.99, 5.20, false, 15),
    (2, 'Grilled Salmon', 'Fresh salmon with herbs', 24.99, 10.50, false, 20),
    (2, 'Vegetable Pasta', 'Fresh pasta with seasonal veggies', 16.99, 6.80, true, 15),
    (3, 'Fresh Lime Soda', 'Refreshing mint lime', 4.99, 1.20, true, 5),
    (3, 'Mango Smoothie', 'Fresh mango blended with yogurt', 6.99, 2.50, true, 8),
    (4, 'Chocolate Lava', 'Warm chocolate cake', 8.99, 3.00, true, 12),
    (4, 'Ice Cream Sundae', 'Three scoops with toppings', 7.99, 2.80, true, 5);

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, phone, email) VALUES
    ('Fresh Foods Inc', 'John Smith', '555-0100', 'john@freshfoods.com'),
    ('Beverage Distributors', 'Sarah Johnson', '555-0101', 'sarah@beveragedist.com'),
    ('Quality Meats', 'Mike Wilson', '555-0102', 'mike@qualitymeats.com');

-- Insert sample inventory
INSERT INTO inventory (item_name, supplier_id, quantity, unit, reorder_level, unit_cost) VALUES
    ('Chicken Wings', 3, 50.00, 'kg', 10.00, 5.00),
    ('Salmon Fillets', 3, 20.00, 'kg', 5.00, 15.00),
    ('Vegetables Mix', 1, 30.00, 'kg', 8.00, 3.00),
    ('Mango Pulp', 2, 15.00, 'liter', 5.00, 4.00);
