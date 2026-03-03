-- Add missing columns to menu_items table
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS is_spicy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_vegan BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_gluten_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_signature BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_special BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS discount_allowed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discounted_price DECIMAL(10,2);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_menu_items_spicy ON menu_items(is_spicy);
CREATE INDEX IF NOT EXISTS idx_menu_items_vegan ON menu_items(is_vegan);
CREATE INDEX IF NOT EXISTS idx_menu_items_signature ON menu_items(is_signature);
CREATE INDEX IF NOT EXISTS idx_menu_items_special ON menu_items(is_special);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'menu_items' 
ORDER BY ordinal_position;
