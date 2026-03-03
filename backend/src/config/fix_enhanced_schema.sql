-- ============================================
-- FIXED ENHANCED SCHEMA FOR RMS PRO
-- ============================================

-- ============================================
-- 1. HANDLE CUSTOMERS TABLE (if exists)
-- ============================================

-- Check if customers table exists and has data
DO $$
BEGIN
    -- If customers table exists but doesn't have all columns, alter it
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        -- Add missing columns
        BEGIN
            ALTER TABLE customers 
            ADD COLUMN IF NOT EXISTS date_of_birth DATE,
            ADD COLUMN IF NOT EXISTS anniversary_date DATE,
            ADD COLUMN IF NOT EXISTS address TEXT,
            ADD COLUMN IF NOT EXISTS preferences JSONB,
            ADD COLUMN IF NOT EXISTS notes TEXT,
            ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS average_order_value DECIMAL(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS last_visit TIMESTAMP,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        EXCEPTION
            WHEN duplicate_column THEN
                RAISE NOTICE 'Column already exists, skipping';
        END;
    END IF;
END $$;

-- ============================================
-- 2. DROP AND RECREATE TABLES THAT DEPEND ON CUSTOMERS
-- ============================================

-- Drop dependent tables first (in correct order)
DROP TABLE IF EXISTS loyalty_transactions CASCADE;
DROP TABLE IF EXISTS customer_loyalty CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS loyalty_programs CASCADE;

-- ============================================
-- 3. LOYALTY PROGRAMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS loyalty_programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    points_per_currency DECIMAL(5,2) DEFAULT 1,
    currency_per_point DECIMAL(5,2) DEFAULT 0.01,
    minimum_redeem_points INTEGER DEFAULT 100,
    expiry_days INTEGER DEFAULT 365,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. CUSTOMER LOYALTY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS customer_loyalty (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    program_id INTEGER REFERENCES loyalty_programs(id),
    points_balance INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze',
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. LOYALTY TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    reference_id INTEGER,
    reference_type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. RESERVATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    table_id INTEGER REFERENCES tables(id),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    guest_count INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed',
    special_requests TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. INSERT INITIAL DATA (WITH CHECKS)
-- ============================================

-- Insert loyalty programs if not exist
INSERT INTO loyalty_programs (name, points_per_currency, currency_per_point, minimum_redeem_points)
SELECT 'Standard Rewards', 10, 0.01, 100
WHERE NOT EXISTS (SELECT 1 FROM loyalty_programs WHERE name = 'Standard Rewards');

INSERT INTO loyalty_programs (name, points_per_currency, currency_per_point, minimum_redeem_points)
SELECT 'Premium Rewards', 15, 0.015, 50
WHERE NOT EXISTS (SELECT 1 FROM loyalty_programs WHERE name = 'Premium Rewards');

-- Insert sample customers only if table is empty
INSERT INTO customers (phone, email, full_name, total_visits, total_spent)
SELECT '9876543210', 'john@example.com', 'John Doe', 15, 12500
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone = '9876543210');

INSERT INTO customers (phone, email, full_name, total_visits, total_spent)
SELECT '9876543211', 'jane@example.com', 'Jane Smith', 8, 6800
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone = '9876543211');

INSERT INTO customers (phone, email, full_name, total_visits, total_spent)
SELECT '9876543212', 'bob@example.com', 'Bob Johnson', 3, 2100
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone = '9876543212');

-- Enroll customers in loyalty program (with conflict handling)
INSERT INTO customer_loyalty (customer_id, program_id, points_balance, lifetime_points, tier)
SELECT c.id, lp.id, 
       CASE 
           WHEN c.full_name = 'John Doe' THEN 1250
           WHEN c.full_name = 'Jane Smith' THEN 680
           WHEN c.full_name = 'Bob Johnson' THEN 210
           ELSE 0
       END,
       CASE 
           WHEN c.full_name = 'John Doe' THEN 1250
           WHEN c.full_name = 'Jane Smith' THEN 680
           WHEN c.full_name = 'Bob Johnson' THEN 210
           ELSE 0
       END,
       CASE 
           WHEN c.full_name = 'John Doe' THEN 'silver'
           WHEN c.full_name = 'Jane Smith' THEN 'bronze'
           WHEN c.full_name = 'Bob Johnson' THEN 'bronze'
           ELSE 'bronze'
       END
FROM customers c
CROSS JOIN loyalty_programs lp
WHERE lp.name = 'Standard Rewards'
  AND c.phone IN ('9876543210', '9876543211', '9876543212')
  AND NOT EXISTS (
      SELECT 1 FROM customer_loyalty cl 
      WHERE cl.customer_id = c.id
  );

-- Insert sample reservations (with checks)
INSERT INTO reservations (customer_id, table_id, reservation_date, reservation_time, guest_count, status)
SELECT c.id, t.id, CURRENT_DATE + INTERVAL '1 day', '19:00', 2, 'confirmed'
FROM customers c, tables t
WHERE c.phone = '9876543210' AND t.table_number = 1
  AND NOT EXISTS (
      SELECT 1 FROM reservations r 
      WHERE r.customer_id = c.id AND r.reservation_date = CURRENT_DATE + INTERVAL '1 day'
  );

INSERT INTO reservations (customer_id, table_id, reservation_date, reservation_time, guest_count, status)
SELECT c.id, t.id, CURRENT_DATE + INTERVAL '1 day', '20:00', 4, 'confirmed'
FROM customers c, tables t
WHERE c.phone = '9876543211' AND t.table_number = 2
  AND NOT EXISTS (
      SELECT 1 FROM reservations r 
      WHERE r.customer_id = c.id AND r.reservation_date = CURRENT_DATE + INTERVAL '1 day'
  );

INSERT INTO reservations (customer_id, table_id, reservation_date, reservation_time, guest_count, status)
SELECT c.id, t.id, CURRENT_DATE + INTERVAL '2 days', '19:30', 2, 'confirmed'
FROM customers c, tables t
WHERE c.phone = '9876543212' AND t.table_number = 3
  AND NOT EXISTS (
      SELECT 1 FROM reservations r 
      WHERE r.customer_id = c.id AND r.reservation_date = CURRENT_DATE + INTERVAL '2 days'
  );

-- Insert sample expenses
INSERT INTO expenses (category_id, amount, description, expense_date, payment_method)
SELECT 1, 50000, 'Monthly rent - March', '2024-03-01', 'Bank Transfer'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE description = 'Monthly rent - March' AND expense_date = '2024-03-01');

INSERT INTO expenses (category_id, amount, description, expense_date, payment_method)
SELECT 2, 8500, 'Electricity bill - March', '2024-03-05', 'Bank Transfer'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE description = 'Electricity bill - March' AND expense_date = '2024-03-05');

INSERT INTO expenses (category_id, amount, description, expense_date, payment_method)
SELECT 4, 25000, 'Weekly food supplies', '2024-03-07', 'Cash'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE description = 'Weekly food supplies' AND expense_date = '2024-03-07');

INSERT INTO expenses (category_id, amount, description, expense_date, payment_method)
SELECT 5, 8000, 'Beverage supplies', '2024-03-07', 'Cash'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE description = 'Beverage supplies' AND expense_date = '2024-03-07');

INSERT INTO expenses (category_id, amount, description, expense_date, payment_method)
SELECT 7, 5000, 'Social media ads', '2024-03-10', 'Credit Card'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE description = 'Social media ads' AND expense_date = '2024-03-10');

-- ============================================
-- 8. VERIFY THE DATA
-- ============================================

-- Show counts
SELECT 'customers' as table_name, COUNT(*) as record_count FROM customers
UNION ALL
SELECT 'customer_loyalty', COUNT(*) FROM customer_loyalty
UNION ALL
SELECT 'loyalty_programs', COUNT(*) FROM loyalty_programs
UNION ALL
SELECT 'reservations', COUNT(*) FROM reservations
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses;
