-- Add any missing columns to menu_categories
ALTER TABLE menu_categories 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS image_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Verify
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'menu_categories' 
ORDER BY ordinal_position;
