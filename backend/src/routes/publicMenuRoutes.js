import express from "express";
import pool from "../db/db.js";

const router = express.Router();

// All public menu data is scoped to the single active restaurant, matching
// the convention already used by /gst below — these endpoints don't accept
// a restaurant selector because the app has no multi-restaurant UX.
const ACTIVE_RESTAURANT_ID_SUBQUERY = "(SELECT id FROM restaurants WHERE is_active = TRUE LIMIT 1)";

// GET /api/menu/categories — Public: get all active categories
router.get("/categories", async (req, res, next) => {
    try {
        const categories = await pool.query(
            `SELECT id, restaurant_id, name, description, image_url, display_order
             FROM categories
             WHERE is_active = TRUE AND restaurant_id = ${ACTIVE_RESTAURANT_ID_SUBQUERY}
             ORDER BY display_order ASC, created_at ASC`
        );
        res.json({ categories: categories.rows });
    } catch (error) {
        next(error);
    }
});

// GET /api/menu/items — Public: get all available menu items
router.get("/items", async (req, res, next) => {
    try {
        const categoryId = req.query.category_id ? parseInt(req.query.category_id) : null;

        let query = `
      SELECT mi.id, mi.restaurant_id, mi.category_id, mi.name, mi.description,
             mi.price, mi.discount_price, mi.image_url, mi.is_veg, mi.is_available,
             mi.preparation_time, mi.calories, mi.display_order,
             c.name as category_name,
             COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS review_count
      FROM menu_items mi
      JOIN categories c ON mi.category_id = c.id
      LEFT JOIN reviews r ON r.menu_item_id = mi.id
      WHERE mi.is_available = TRUE AND c.is_active = TRUE
        AND mi.restaurant_id = ${ACTIVE_RESTAURANT_ID_SUBQUERY}
    `;
        const params = [];

        if (categoryId) {
            params.push(categoryId);
            query += ` AND mi.category_id = $${params.length}`;
        }

        query += " GROUP BY mi.id, c.name";

        // Not real pagination — a restaurant's menu is naturally bounded, and the
        // frontend fetches the whole catalog once for client-side search/filter.
        // This is just a defensive cap against unbounded growth.
        query += " ORDER BY mi.display_order ASC, mi.created_at DESC LIMIT 500";

        const items = await pool.query(query, params);
        res.json({ menu_items: items.rows });
    } catch (error) {
        next(error);
    }
});

// GET /api/menu/featured — Public: get featured/popular items
router.get("/featured", async (req, res, next) => {
    try {
        const items = await pool.query(
            `SELECT mi.id, mi.name, mi.price, mi.discount_price, mi.image_url, mi.is_veg,
                    c.name as category_name
             FROM menu_items mi
             JOIN categories c ON mi.category_id = c.id
             WHERE mi.is_featured = TRUE AND mi.is_available = TRUE AND c.is_active = TRUE
               AND mi.restaurant_id = ${ACTIVE_RESTAURANT_ID_SUBQUERY}
             ORDER BY mi.display_order ASC
             LIMIT 8`
        );
        res.json({ featured_items: items.rows });
    } catch (error) {
        next(error);
    }
});

// GET /api/menu/gst — Get restaurant GST settings (for cart display)
router.get("/gst", async (req, res, next) => {
    try {
        const result = await pool.query(
            "SELECT gst_enabled, gst_percentage, gst_label FROM restaurants WHERE is_active = TRUE LIMIT 1"
        );
        res.json({ gst: result.rows[0] || { gst_enabled: false, gst_percentage: 0, gst_label: 'GST' } });
    } catch (error) {
        next(error);
    }
});

export default router;
