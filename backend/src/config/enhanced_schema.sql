-- Enhanced Database Schema for RMS Pro

-- ============================================
-- 1. ENHANCED USERS & STAFF MANAGEMENT
-- ============================================

-- Drop existing tables if they exist (be careful with this in production!)
DROP TABLE IF EXISTS staff_schedules CASCADE;
DROP TABLE IF EXISTS staff_performance CASCADE;
DROP TABLE IF EXISTS staff_departments CASCADE;

-- Staff Departments
CREATE TABLE staff_departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced users table with more fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES staff_departments(id),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) DEFAULT 'full-time', -- full-time, part-time, contract
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_routing VARCHAR(20),
ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(255);

-- Staff Work Schedules
CREATE TABLE staff_schedules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_break BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, day_of_week, start_time)
);

-- Staff Time Tracking
CREATE TABLE staff_time_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP,
    total_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, absent
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Performance Reviews
CREATE TABLE staff_performance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    review_date DATE NOT NULL,
    reviewer_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    metrics JSONB, -- Stores performance metrics like orders_processed, sales_amount etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. ENHANCED INVENTORY MANAGEMENT
-- ============================================

-- Inventory Categories
CREATE TABLE inventory_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add category to inventory
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES inventory_categories(id),
ADD COLUMN IF NOT EXISTS min_quantity DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_quantity DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS location VARCHAR(50), -- storage location
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);

-- Inventory Transactions (for tracking all movements)
CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- purchase, sale, waste, adjustment, return
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    reference_id INTEGER, -- could be order_id, purchase_id etc.
    reference_type VARCHAR(50), -- 'order', 'purchase', 'waste'
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Waste Tracking
CREATE TABLE waste_tracking (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL,
    reason VARCHAR(100) NOT NULL, -- expired, spoiled, damaged, etc.
    cost DECIMAL(10,2),
    notes TEXT,
    reported_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Alerts
CREATE TABLE inventory_alerts (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- low_stock, expiring, out_of_stock
    threshold_value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id)
);

-- ============================================
-- 3. ENHANCED MENU MANAGEMENT
-- ============================================

-- Recipe Management
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    instructions TEXT,
    preparation_time INTEGER, -- in minutes
    cooking_time INTEGER,
    serving_size INTEGER DEFAULT 1,
    cost_per_serving DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe Ingredients
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    inventory_id INTEGER REFERENCES inventory(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    waste_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu Item Modifiers (for customizations)
CREATE TABLE menu_modifiers (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL, -- single, multiple, required, optional
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modifier Options
CREATE TABLE modifier_options (
    id SERIAL PRIMARY KEY,
    modifier_id INTEGER REFERENCES menu_modifiers(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    calories INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu Item Nutritional Info
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS calories INTEGER,
ADD COLUMN IF NOT EXISTS protein DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS carbs DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fat DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS allergens TEXT[], -- array of allergens
ADD COLUMN IF NOT EXISTS tags TEXT[]; -- for search/filter

-- Menu Availability Schedule
CREATE TABLE menu_availability (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. ENHANCED ORDER MANAGEMENT
-- ============================================

-- Order Status History
CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Status Tracking
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id); -- kitchen staff

-- Kitchen Display System Queue
CREATE TABLE kitchen_queue (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id INTEGER REFERENCES order_items(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    estimated_time INTEGER, -- in minutes
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    station VARCHAR(50), -- grill, fry, salad, etc.
    status VARCHAR(20) DEFAULT 'pending'
);

-- ============================================
-- 5. CUSTOMER LOYALTY & CRM
-- ============================================

-- Enhanced Customers Table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    full_name VARCHAR(100),
    date_of_birth DATE,
    anniversary_date DATE,
    address TEXT,
    preferences JSONB, -- dietary preferences, favorite items
    notes TEXT,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    last_visit TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty Program
CREATE TABLE loyalty_programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    points_per_currency DECIMAL(5,2) DEFAULT 1, -- points earned per $1
    currency_per_point DECIMAL(5,2) DEFAULT 0.01, -- $ value per point
    minimum_redeem_points INTEGER DEFAULT 100,
    expiry_days INTEGER DEFAULT 365,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Loyalty Points
CREATE TABLE customer_loyalty (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    program_id INTEGER REFERENCES loyalty_programs(id),
    points_balance INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze', -- bronze, silver, gold, platinum
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty Transactions
CREATE TABLE loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- earned, redeemed, expired, adjusted
    reference_id INTEGER, -- order_id for earned, redemption_id for redeemed
    reference_type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Reservations
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    table_id INTEGER REFERENCES tables(id),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    guest_count INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled, completed, no-show
    special_requests TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. FINANCE & ACCOUNTING
-- ============================================

-- Payment Methods
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL, -- cash, card, mobile, voucher
    fee_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Payments Table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    payment_method_id INTEGER REFERENCES payment_methods(id),
    amount DECIMAL(10,2) NOT NULL,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    transaction_id VARCHAR(100), -- external transaction ID
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    processed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses Tracking
CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES expense_categories(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50),
    receipt_url VARCHAR(255),
    approved_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Sales Summary
CREATE TABLE daily_sales (
    id SERIAL PRIMARY KEY,
    sale_date DATE UNIQUE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    total_tax DECIMAL(10,2) DEFAULT 0,
    total_tips DECIMAL(10,2) DEFAULT 0,
    cash_amount DECIMAL(10,2) DEFAULT 0,
    card_amount DECIMAL(10,2) DEFAULT 0,
    mobile_amount DECIMAL(10,2) DEFAULT 0,
    voucher_amount DECIMAL(10,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    labor_cost DECIMAL(10,2) DEFAULT 0,
    food_cost DECIMAL(10,2) DEFAULT 0,
    profit DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================

-- Users & Staff indexes
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_staff_schedules_user ON staff_schedules(user_id);
CREATE INDEX idx_staff_time_tracking_user ON staff_time_tracking(user_id);
CREATE INDEX idx_staff_time_tracking_date ON staff_time_tracking(clock_in);

-- Inventory indexes
CREATE INDEX idx_inventory_category ON inventory(category_id);
CREATE INDEX idx_inventory_expiry ON inventory(expiry_date);
CREATE INDEX idx_inventory_transactions_inventory ON inventory_transactions(inventory_id);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(created_at);

-- Menu indexes
CREATE INDEX idx_recipes_menu_item ON recipes(menu_item_id);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_inventory ON recipe_ingredients(inventory_id);
CREATE INDEX idx_menu_availability_item ON menu_availability(menu_item_id);

-- Order indexes
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX idx_kitchen_queue_status ON kitchen_queue(status);
CREATE INDEX idx_kitchen_queue_order ON kitchen_queue(order_id);

-- Customer indexes
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customer_loyalty_customer ON customer_loyalty(customer_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_customer ON reservations(customer_id);

-- Finance indexes
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_date ON payments(created_at);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_daily_sales_date ON daily_sales(sale_date);

-- ============================================
-- 8. INSERT INITIAL DATA
-- ============================================

-- Insert staff departments
INSERT INTO staff_departments (name, description) VALUES
('Management', 'Restaurant managers and supervisors'),
('Kitchen', 'Chefs and kitchen staff'),
('Service', 'Waiters and servers'),
('Bar', 'Bartenders and bar staff'),
('Host', 'Hosts and greeters'),
('Cleaning', 'Cleaning and maintenance staff');

-- Insert payment methods
INSERT INTO payment_methods (name, type, fee_percentage) VALUES
('Cash', 'cash', 0),
('Credit Card', 'card', 2.5),
('Debit Card', 'card', 1.5),
('Google Pay', 'mobile', 1.8),
('Apple Pay', 'mobile', 1.8),
('Paytm', 'mobile', 1.8),
('Gift Card', 'voucher', 0);

-- Insert expense categories
INSERT INTO expense_categories (name, description) VALUES
('Rent', 'Monthly rent payment'),
('Utilities', 'Electricity, water, gas'),
('Salaries', 'Staff salaries and wages'),
('Food Supplies', 'Ingredients and food items'),
('Beverage Supplies', 'Drinks and bar supplies'),
('Equipment', 'Kitchen equipment and maintenance'),
('Marketing', 'Advertising and promotions'),
('Insurance', 'Business insurance'),
('Licenses', 'Business licenses and permits'),
('Miscellaneous', 'Other expenses');

-- Insert inventory categories
INSERT INTO inventory_categories (name, description) VALUES
('Produce', 'Fresh fruits and vegetables'),
('Meat', 'Fresh and frozen meat'),
('Seafood', 'Fresh and frozen seafood'),
('Dairy', 'Milk, cheese, eggs, etc.'),
('Dry Goods', 'Pasta, rice, flour, etc.'),
('Beverages', 'Soft drinks, juices, etc.'),
('Alcohol', 'Beer, wine, spirits'),
('Cleaning', 'Cleaning supplies'),
('Packaging', 'Takeaway containers, bags'),
('Other', 'Miscellaneous items');

-- Insert sample loyalty program
INSERT INTO loyalty_programs (name, points_per_currency, currency_per_point, minimum_redeem_points) VALUES
('Standard Rewards', 10, 0.01, 100),
('Premium Rewards', 15, 0.015, 50);

-- Insert sample customers (for testing)
INSERT INTO customers (phone, email, full_name, total_visits, total_spent) VALUES
('9876543210', 'john@example.com', 'John Doe', 15, 12500),
('9876543211', 'jane@example.com', 'Jane Smith', 8, 6800),
('9876543212', 'bob@example.com', 'Bob Johnson', 3, 2100);

-- Enroll customers in loyalty program
INSERT INTO customer_loyalty (customer_id, program_id, points_balance, lifetime_points, tier) VALUES
(1, 1, 1250, 1250, 'silver'),
(2, 1, 680, 680, 'bronze'),
(3, 1, 210, 210, 'bronze');

-- Insert sample tables if not exist
INSERT INTO tables (table_number, capacity, location, status) VALUES
(1, 2, 'Window', 'available'),
(2, 4, 'Center', 'available'),
(3, 4, 'Center', 'available'),
(4, 6, 'Corner', 'available'),
(5, 8, 'Private', 'available'),
(6, 2, 'Outdoor', 'available'),
(7, 4, 'Outdoor', 'available'),
(8, 2, 'Bar', 'available'),
(9, 4, 'Bar', 'available'),
(10, 2, 'Window', 'available')
ON CONFLICT (table_number) DO NOTHING;

-- Insert sample reservations
INSERT INTO reservations (customer_id, table_id, reservation_date, reservation_time, guest_count, status) VALUES
(1, 1, CURRENT_DATE + INTERVAL '1 day', '19:00', 2, 'confirmed'),
(2, 2, CURRENT_DATE + INTERVAL '1 day', '20:00', 4, 'confirmed'),
(3, 3, CURRENT_DATE + INTERVAL '2 days', '19:30', 2, 'confirmed');

-- Insert sample expenses
INSERT INTO expenses (category_id, amount, description, expense_date, payment_method) VALUES
(1, 50000, 'Monthly rent - March', '2024-03-01', 'Bank Transfer'),
(2, 8500, 'Electricity bill - March', '2024-03-05', 'Bank Transfer'),
(4, 25000, 'Weekly food supplies', '2024-03-07', 'Cash'),
(5, 8000, 'Beverage supplies', '2024-03-07', 'Cash'),
(7, 5000, 'Social media ads', '2024-03-10', 'Credit Card');
