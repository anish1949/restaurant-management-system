-- ============================================
-- REMAINING TABLES FROM ENHANCED SCHEMA
-- ============================================

-- Inventory Categories (if not exists)
CREATE TABLE IF NOT EXISTS inventory_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to inventory
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES inventory_categories(id),
ADD COLUMN IF NOT EXISTS min_quantity DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_quantity DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS location VARCHAR(50),
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    reference_id INTEGER,
    reference_type VARCHAR(50),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Waste Tracking
CREATE TABLE IF NOT EXISTS waste_tracking (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    cost DECIMAL(10,2),
    notes TEXT,
    reported_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Alerts
CREATE TABLE IF NOT EXISTS inventory_alerts (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    threshold_value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id)
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    instructions TEXT,
    preparation_time INTEGER,
    cooking_time INTEGER,
    serving_size INTEGER DEFAULT 1,
    cost_per_serving DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe Ingredients
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    inventory_id INTEGER REFERENCES inventory(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    waste_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu Modifiers
CREATE TABLE IF NOT EXISTS menu_modifiers (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modifier Options
CREATE TABLE IF NOT EXISTS modifier_options (
    id SERIAL PRIMARY KEY,
    modifier_id INTEGER REFERENCES menu_modifiers(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    calories INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to menu_items
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS calories INTEGER,
ADD COLUMN IF NOT EXISTS protein DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS carbs DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fat DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS allergens TEXT[],
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Menu Availability
CREATE TABLE IF NOT EXISTS menu_availability (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Status History
CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id);

-- Kitchen Queue
CREATE TABLE IF NOT EXISTS kitchen_queue (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id INTEGER REFERENCES order_items(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    estimated_time INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    station VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending'
);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,
    fee_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    payment_method_id INTEGER REFERENCES payment_methods(id),
    amount DECIMAL(10,2) NOT NULL,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    processed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Sales
CREATE TABLE IF NOT EXISTS daily_sales (
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

-- Insert payment methods
INSERT INTO payment_methods (name, type, fee_percentage)
SELECT 'Cash', 'cash', 0
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Cash');

INSERT INTO payment_methods (name, type, fee_percentage)
SELECT 'Credit Card', 'card', 2.5
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Credit Card');

INSERT INTO payment_methods (name, type, fee_percentage)
SELECT 'Debit Card', 'card', 1.5
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Debit Card');

INSERT INTO payment_methods (name, type, fee_percentage)
SELECT 'Google Pay', 'mobile', 1.8
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Google Pay');

INSERT INTO payment_methods (name, type, fee_percentage)
SELECT 'Apple Pay', 'mobile', 1.8
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Apple Pay');

INSERT INTO payment_methods (name, type, fee_percentage)
SELECT 'Paytm', 'mobile', 1.8
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Paytm');

INSERT INTO payment_methods (name, type, fee_percentage)
SELECT 'Gift Card', 'voucher', 0
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Gift Card');

-- Insert inventory categories
INSERT INTO inventory_categories (name, description)
SELECT 'Produce', 'Fresh fruits and vegetables'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Produce');

INSERT INTO inventory_categories (name, description)
SELECT 'Meat', 'Fresh and frozen meat'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Meat');

INSERT INTO inventory_categories (name, description)
SELECT 'Seafood', 'Fresh and frozen seafood'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Seafood');

INSERT INTO inventory_categories (name, description)
SELECT 'Dairy', 'Milk, cheese, eggs, etc.'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Dairy');

INSERT INTO inventory_categories (name, description)
SELECT 'Dry Goods', 'Pasta, rice, flour, etc.'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Dry Goods');

INSERT INTO inventory_categories (name, description)
SELECT 'Beverages', 'Soft drinks, juices, etc.'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Beverages');

INSERT INTO inventory_categories (name, description)
SELECT 'Alcohol', 'Beer, wine, spirits'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Alcohol');

INSERT INTO inventory_categories (name, description)
SELECT 'Cleaning', 'Cleaning supplies'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Cleaning');

INSERT INTO inventory_categories (name, description)
SELECT 'Packaging', 'Takeaway containers, bags'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Packaging');

INSERT INTO inventory_categories (name, description)
SELECT 'Other', 'Miscellaneous items'
WHERE NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Other');

-- Show final counts
SELECT 'inventory_categories' as table_name, COUNT(*) as record_count FROM inventory_categories
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM payment_methods
UNION ALL
SELECT 'menu_items', COUNT(*) FROM menu_items;
