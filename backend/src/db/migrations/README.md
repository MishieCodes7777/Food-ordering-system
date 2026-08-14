# Database Migrations

Run these SQL files in order against your PostgreSQL database (`akio_db`) to set up the schema.

## How to run

```bash
# Connect to your database and run each file in order:
psql -U postgres -d akio_db -f src/db/migrations/001_create_users.sql
psql -U postgres -d akio_db -f src/db/migrations/002_create_carts.sql
psql -U postgres -d akio_db -f src/db/migrations/003_create_cart_items.sql
psql -U postgres -d akio_db -f src/db/migrations/004_create_orders.sql
psql -U postgres -d akio_db -f src/db/migrations/005_create_order_items.sql
psql -U postgres -d akio_db -f src/db/migrations/006_create_payments.sql
psql -U postgres -d akio_db -f src/db/migrations/007_create_restaurants.sql
psql -U postgres -d akio_db -f src/db/migrations/008_create_categories.sql
psql -U postgres -d akio_db -f src/db/migrations/009_create_menu_items.sql
psql -U postgres -d akio_db -f src/db/migrations/010_create_menu_item_images.sql
psql -U postgres -d akio_db -f src/db/migrations/011_create_restaurant_tables.sql
psql -U postgres -d akio_db -f src/db/migrations/012_create_order_status_history.sql
psql -U postgres -d akio_db -f src/db/migrations/013_create_admin_users.sql
psql -U postgres -d akio_db -f src/db/migrations/014_create_analytics_summary.sql
psql -U postgres -d akio_db -f src/db/migrations/015_add_missing_columns.sql
psql -U postgres -d akio_db -f src/db/migrations/016_add_indexes.sql
psql -U postgres -d akio_db -f src/db/migrations/017_add_phone_verified.sql
psql -U postgres -d akio_db -f src/db/migrations/018_create_reviews.sql
psql -U postgres -d akio_db -f src/db/migrations/019_create_coupons.sql
psql -U postgres -d akio_db -f src/db/migrations/020_add_show_home_stats_to_restaurants.sql
```

## Notes
- Files use `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so they're safe to run multiple times.
- Run them in numerical order since later tables reference earlier ones (foreign keys).
- Migrations 001-006: Customer side (users, carts, orders, payments)
- Migrations 007-014: Admin side (restaurants, categories, menu_items, images, tables, status history, admin_users, analytics)
- Migration 015: adds columns that existed on the live DB by hand before being codified (food_type_choice, food_type, is_featured, gst_*)
- Migration 016: adds indexes — Postgres doesn't auto-index foreign key columns, and none existed before this
- Migration 017: phone_verified flag for OTP-gated registration
- Migration 018: reviews — one rating (1-5) + optional comment per completed **order**, not per menu item. Feeds the home page's real customer count/rating and testimonials.
- Migration 019: coupons
- Migration 020: restaurants.show_home_stats — admin toggle to show/hide the real customer count & rating on the home page
- Check this directory's actual file listing for the current highest migration number — this README can lag behind new migrations.

## Table Overview

| # | Table | Purpose |
|---|-------|---------|
| 001 | users | Customer accounts |
| 002 | carts | Per-user shopping carts |
| 003 | cart_items | Items in each cart |
| 004 | orders | Placed orders |
| 005 | order_items | Items in each order (price snapshot) |
| 006 | payments | Payment records (Razorpay) |
| 007 | restaurants | Restaurant/shop profiles |
| 008 | categories | Menu categories (Pizza, Burger, Drinks, etc.) |
| 009 | menu_items | Food items with price, availability, etc. |
| 010 | menu_item_images | Multiple images per menu item |
| 011 | restaurant_tables | QR-based table ordering |
| 012 | order_status_history | Tracks order status changes |
| 013 | admin_users | Restaurant staff (Owner/Manager/Staff roles) |
| 014 | analytics_summary | Daily revenue/order analytics per restaurant |
| 015 | (columns) | food_type_choice, food_type, is_featured, gst_* on existing tables |
| 016 | (indexes) | Foreign key / hot-path indexes |
| 017 | (column) | users.phone_verified |
| 018 | reviews | Customer ratings (1-5) + comments on completed orders |
| 019 | coupons | Discount coupons |
| 020 | restaurants.show_home_stats | Admin toggle to show/hide customer count & rating on home page |
