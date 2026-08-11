// Shared by the standalone coupon-preview endpoint and placeOrder's actual
// charge — same rules evaluated in both places, so a coupon that "validates"
// at checkout preview is guaranteed to actually apply when the order is
// placed a moment later. `queryable` is either `pool` or an in-transaction
// `client` — both expose the same .query() interface.
export const evaluateCoupon = async (queryable, restaurantId, code, orderTotal, userId) => {
  const normalizedCode = code.trim().toUpperCase();

  const result = await queryable.query(
    "SELECT * FROM coupons WHERE restaurant_id = $1 AND code = $2",
    [restaurantId, normalizedCode]
  );
  if (result.rows.length === 0) {
    return { valid: false, message: "Invalid coupon code" };
  }
  const coupon = result.rows[0];

  if (!coupon.is_active) {
    return { valid: false, message: "This coupon is no longer active" };
  }

  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { valid: false, message: "This coupon isn't active yet" };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { valid: false, message: "This coupon has expired" };
  }
  if (parseFloat(orderTotal) < parseFloat(coupon.min_order_amount)) {
    return { valid: false, message: `Minimum order amount for this coupon is ₹${coupon.min_order_amount}` };
  }
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return { valid: false, message: "This coupon has reached its usage limit" };
  }

  const userUsage = await queryable.query(
    "SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2",
    [coupon.id, userId]
  );
  if (parseInt(userUsage.rows[0].count) >= coupon.per_user_limit) {
    return { valid: false, message: "You've already used this coupon" };
  }

  let discount = coupon.discount_type === "percentage"
    ? (parseFloat(orderTotal) * parseFloat(coupon.discount_value)) / 100
    : parseFloat(coupon.discount_value);

  if (coupon.max_discount_amount) {
    discount = Math.min(discount, parseFloat(coupon.max_discount_amount));
  }
  // Never discount more than the order itself — no negative/zero-priced orders.
  discount = Math.min(discount, parseFloat(orderTotal));

  return {
    valid: true,
    coupon,
    discount_amount: Math.round(discount * 100) / 100,
    final_amount: Math.round((parseFloat(orderTotal) - discount) * 100) / 100,
  };
};
