import pool from "../db/db.js";

// POST /api/reviews — create or update the logged-in customer's review for
// a menu item. Only allowed if they have at least one COMPLETED order
// containing that item — reviews are meant to be verified-purchase, not
// open to anyone who's merely browsed the menu.
export const createOrUpdateReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { menu_item_id, rating, comment } = req.body;

    const item = await pool.query(
      "SELECT id, restaurant_id FROM menu_items WHERE id = $1",
      [menu_item_id]
    );
    if (item.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    const purchased = await pool.query(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.menu_item_id = $2 AND o.status = 'completed'
       LIMIT 1`,
      [userId, menu_item_id]
    );
    if (purchased.rows.length === 0) {
      return res.status(403).json({ message: "You can only review items from a completed order" });
    }

    const result = await pool.query(
      `INSERT INTO reviews (user_id, menu_item_id, restaurant_id, rating, comment, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (user_id, menu_item_id)
       DO UPDATE SET rating = $4, comment = $5, updated_at = NOW()
       RETURNING id, rating, comment, created_at, updated_at`,
      [userId, menu_item_id, item.rows[0].restaurant_id, rating, comment || null]
    );

    res.status(201).json({ review: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// GET /api/reviews/item/:itemId — public list of reviews for one menu item
export const getReviewsForItem = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    const reviews = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS customer_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.menu_item_id = $1
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [itemId]
    );

    const summary = await pool.query(
      `SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*) AS review_count
       FROM reviews WHERE menu_item_id = $1`,
      [itemId]
    );

    res.json({
      reviews: reviews.rows,
      avg_rating: parseFloat(summary.rows[0].avg_rating),
      review_count: parseInt(summary.rows[0].review_count),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reviews/reviewable — menu items the logged-in customer has
// completed an order for, along with whether they've already reviewed each
// one (so the frontend can show "Rate this" vs "Edit your review").
export const getReviewableItems = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT DISTINCT ON (mi.id)
         mi.id, mi.name, mi.image_url,
         r.id AS review_id, r.rating, r.comment
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN menu_items mi ON oi.menu_item_id = mi.id
       LEFT JOIN reviews r ON r.menu_item_id = mi.id AND r.user_id = $1
       WHERE o.user_id = $1 AND o.status = 'completed'
       ORDER BY mi.id`,
      [userId]
    );

    res.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/reviews/:id — moderation: remove a spam/abusive review
export const deleteReviewAdmin = async (req, res, next) => {
  try {
    const restaurantId = req.admin.restaurant_id;
    const reviewId = parseInt(req.params.id);
    if (isNaN(reviewId)) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

    const result = await pool.query(
      "DELETE FROM reviews WHERE id = $1 AND restaurant_id = $2 RETURNING id",
      [reviewId, restaurantId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Review deleted" });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reviews — moderation list, most recent first
export const getReviewsAdmin = async (req, res, next) => {
  try {
    const restaurantId = req.admin.restaurant_id;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS customer_name, mi.name AS item_name,
              COUNT(*) OVER() AS total_count
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN menu_items mi ON r.menu_item_id = mi.id
       WHERE r.restaurant_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [restaurantId, limit, offset]
    );

    const total = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count) : 0;
    const reviews = result.rows.map(({ total_count, ...row }) => row);

    res.json({ reviews, page, limit, total });
  } catch (error) {
    next(error);
  }
};
