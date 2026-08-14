import bcrypt from "bcrypt";
import pool from "../db/db.js";

// GET /api/profile — Get current user's profile
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await pool.query(
      "SELECT id, name, email, phone, phone_verified, role, created_at FROM users WHERE id = $1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: user.rows[0] });
  } catch (error) {
    next(error);
  }
};

// PUT /api/profile — Update user's profile (name only — phone is fixed at
// registration since it's the verified identity element; deliberately not
// accepted here even if a client sends one)
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    const updated = await pool.query(
      "UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, phone, phone_verified, role, created_at, updated_at",
      [name, userId]
    );

    res.json({ message: "Profile updated", user: updated.rows[0] });
  } catch (error) {
    next(error);
  }
};

// PUT /api/profile/password — Change password
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    // Get current password hash
    const user = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hashedPassword, userId]
    );

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

// GET /api/profile/orders — Get user's order history with items and payment details (paginated)
export const getOrderHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    // Get this page of orders for the user
    const orders = await pool.query(
      "SELECT id, total_amount, status, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [userId, limit, offset]
    );

    if (orders.rows.length === 0) {
      return res.json({ orders: [], page, limit, message: "No orders yet" });
    }

    // Batch-fetch items and latest payment per order in 2 queries instead of 2 per order
    const orderIds = orders.rows.map((order) => order.id);

    const items = await pool.query(
      "SELECT order_id, menu_item_id, quantity, price FROM order_items WHERE order_id = ANY($1)",
      [orderIds]
    );
    const itemsByOrderId = items.rows.reduce((acc, item) => {
      (acc[item.order_id] ||= []).push(item);
      return acc;
    }, {});

    const payments = await pool.query(
      `SELECT DISTINCT ON (order_id) order_id, amount, payment_method, payment_status, transaction_id, created_at AS paid_at
       FROM payments
       WHERE order_id = ANY($1)
       ORDER BY order_id, created_at DESC`,
      [orderIds]
    );
    const paymentByOrderId = payments.rows.reduce((acc, payment) => {
      acc[payment.order_id] = payment;
      return acc;
    }, {});

    const orderHistory = orders.rows.map((order) => ({
      order_id: order.id,
      total_amount: order.total_amount,
      status: order.status,
      ordered_at: order.created_at,
      items: itemsByOrderId[order.id] || [],
      payment: paymentByOrderId[order.id] || null,
    }));

    res.json({ orders: orderHistory, page, limit });
  } catch (error) {
    next(error);
  }
};
