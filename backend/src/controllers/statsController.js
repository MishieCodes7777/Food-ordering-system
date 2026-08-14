import pool from "../db/db.js";

// GET /api/stats/home — Public: real customer count + average rating for the home page.
// Returns show_stats: false (with no numbers) when the admin has hidden this section.
export const getHomeStats = async (req, res) => {
  try {
    const restaurant = await pool.query(
      "SELECT show_home_stats FROM restaurants WHERE is_active = TRUE ORDER BY id ASC LIMIT 1"
    );

    const showStats = restaurant.rows.length > 0 ? restaurant.rows[0].show_home_stats : true;

    if (!showStats) {
      return res.json({ show_stats: false });
    }

    const customers = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'customer'");
    const rating = await pool.query(
      "SELECT COALESCE(AVG(rating), 0) as average_rating, COUNT(*) as review_count FROM reviews"
    );

    res.json({
      show_stats: true,
      customer_count: parseInt(customers.rows[0].count),
      average_rating: parseFloat(rating.rows[0].average_rating),
      review_count: parseInt(rating.rows[0].review_count),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
