-- These columns already exist on the live database (added by hand outside
-- migrations at some point). This migration codifies them so a fresh
-- install from migrations 001-015 matches the actual schema the app code
-- expects (cartController, orderController, menuItemController,
-- restaurantController, publicMenuRoutes all read/write these columns).

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS food_type_choice VARCHAR(10);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS food_type_choice VARCHAR(10);

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS food_type VARCHAR(10) DEFAULT 'veg';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS gst_enabled BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS gst_label VARCHAR(50) DEFAULT 'GST';
