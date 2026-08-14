import pool from "../db/db.js";

// POST /api/reviews — Submit a rating for a completed order (one per order)
export const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { order_id, rating, comment } = req.body;

    const order = await pool.query(
      "SELECT id, restaurant_id, status FROM orders WHERE id = $1 AND user_id = $2",
      [order_id, userId]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.rows[0].status !== "completed") {
      return res.status(400).json({ message: "You can only review completed orders" });
    }

    const existing = await pool.query("SELECT id FROM reviews WHERE order_id = $1", [order_id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "You have already reviewed this order" });
    }

    const review = await pool.query(
      `INSERT INTO reviews (restaurant_id, user_id, order_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [order.rows[0].restaurant_id, userId, order_id, rating, comment || null]
    );

    res.status(201).json({ message: "Review submitted", review: review.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/reviews/public — Public: real customer reviews that include a written comment,
// for display as testimonials. Never fabricated — empty array if nobody has left one yet.
export const getPublicReviews = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);

    const reviews = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name as user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.comment IS NOT NULL AND TRIM(r.comment) != ''
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit]
    );

    // Show first name + last initial only (e.g. "Priya S.") — don't expose full names publicly
    const testimonials = reviews.rows.map((r) => {
      const parts = r.user_name.trim().split(/\s+/);
      const displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
      return { id: r.id, rating: r.rating, comment: r.comment, name: displayName, created_at: r.created_at };
    });

    res.json({ reviews: testimonials });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/reviews/order/:orderId — Get the current user's review for a specific order (if any)
export const getReviewForOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const review = await pool.query(
      "SELECT * FROM reviews WHERE order_id = $1 AND user_id = $2",
      [orderId, userId]
    );

    res.json({ review: review.rows[0] || null });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
