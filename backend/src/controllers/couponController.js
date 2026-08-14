import pool from "../db/db.js";
import { evaluateCoupon } from "../utils/couponUtils.js";

// POST /api/coupons/validate — checkout-time preview, non-binding. The real
// enforcement happens inside placeOrder's transaction using the same rules,
// so this is purely so the cart page can show "you save ₹X" before the
// customer commits to placing the order.
export const validateCoupon = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { code, order_total } = req.body;

    const restaurant = await pool.query("SELECT id FROM restaurants WHERE is_active = TRUE LIMIT 1");
    if (restaurant.rows.length === 0) {
      return res.status(400).json({ message: "No active restaurant found" });
    }

    const result = await evaluateCoupon(pool, restaurant.rows[0].id, code, order_total, userId);
    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }

    res.json({
      valid: true,
      code: result.coupon.code,
      discount_amount: result.discount_amount,
      final_amount: result.final_amount,
    });
  } catch (error) {
    next(error);
  }
};
