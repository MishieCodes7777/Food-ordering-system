-- Reviews are per-order (not per-item): a customer rates their whole
-- completed order once. This feeds the home page's real customer count /
-- average rating and testimonials — not per-dish ratings on the menu.
--
-- If this migration previously ran with the old per-item schema
-- (menu_item_id, UNIQUE(user_id, menu_item_id)), drop it first — the column
-- set is incompatible and IF NOT EXISTS would otherwise silently no-op,
-- leaving the old schema in place:
--   DROP TABLE IF EXISTS reviews CASCADE;
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON reviews(restaurant_id);
