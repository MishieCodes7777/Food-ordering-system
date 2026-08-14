import pool from "../db/db.js";

// GET /api/admin/coupons — list all coupons for the restaurant
export const getCoupons = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;

        const coupons = await pool.query(
            "SELECT * FROM coupons WHERE restaurant_id = $1 ORDER BY created_at DESC",
            [restaurantId]
        );

        res.json({ coupons: coupons.rows });
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/coupons — create a coupon
export const createCoupon = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const {
            code, description, discount_type, discount_value, min_order_amount,
            max_discount_amount, usage_limit, per_user_limit, valid_until, is_active,
        } = req.body;

        const normalizedCode = code.trim().toUpperCase();

        const existing = await pool.query(
            "SELECT id FROM coupons WHERE restaurant_id = $1 AND code = $2",
            [restaurantId, normalizedCode]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: `Coupon code "${normalizedCode}" already exists` });
        }

        const coupon = await pool.query(
            `INSERT INTO coupons (
                restaurant_id, code, description, discount_type, discount_value, min_order_amount,
                max_discount_amount, usage_limit, per_user_limit, valid_until, is_active, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
             RETURNING *`,
            [
                restaurantId, normalizedCode, description || null, discount_type, discount_value,
                min_order_amount ?? 0, max_discount_amount || null, usage_limit || null,
                per_user_limit ?? 1, valid_until || null, is_active !== false,
            ]
        );

        res.status(201).json({ message: "Coupon created", coupon: coupon.rows[0] });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/coupons/:id — update a coupon (code is immutable once created —
// redemption history is keyed by code, changing it would orphan past records)
export const updateCoupon = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const couponId = parseInt(req.params.id);
        if (isNaN(couponId)) {
            return res.status(400).json({ message: "Invalid coupon ID" });
        }

        const {
            description, discount_type, discount_value, min_order_amount,
            max_discount_amount, usage_limit, per_user_limit, valid_until, is_active,
        } = req.body;

        const updated = await pool.query(
            `UPDATE coupons SET
                description = COALESCE($1, description),
                discount_type = COALESCE($2, discount_type),
                discount_value = COALESCE($3, discount_value),
                min_order_amount = COALESCE($4, min_order_amount),
                max_discount_amount = COALESCE($5, max_discount_amount),
                usage_limit = COALESCE($6, usage_limit),
                per_user_limit = COALESCE($7, per_user_limit),
                valid_until = COALESCE($8, valid_until),
                is_active = COALESCE($9, is_active),
                updated_at = NOW()
             WHERE id = $10 AND restaurant_id = $11
             RETURNING *`,
            [
                description, discount_type, discount_value, min_order_amount,
                max_discount_amount, usage_limit, per_user_limit, valid_until, is_active,
                couponId, restaurantId,
            ]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        res.json({ message: "Coupon updated", coupon: updated.rows[0] });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/coupons/:id — blocked once a coupon has redemption history,
// since coupon_redemptions cascades on delete: hard-deleting would silently wipe
// the discount audit trail and let a per_user_limit be bypassed by recreating the
// same code. Use PUT .../:id { is_active: false } to retire a used coupon instead.
export const deleteCoupon = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const couponId = parseInt(req.params.id);
        if (isNaN(couponId)) {
            return res.status(400).json({ message: "Invalid coupon ID" });
        }

        const coupon = await pool.query(
            "SELECT id FROM coupons WHERE id = $1 AND restaurant_id = $2",
            [couponId, restaurantId]
        );
        if (coupon.rows.length === 0) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        const redemptions = await pool.query(
            "SELECT 1 FROM coupon_redemptions WHERE coupon_id = $1 LIMIT 1",
            [couponId]
        );
        if (redemptions.rows.length > 0) {
            return res.status(409).json({
                message: "This coupon has been redeemed and can't be deleted. Set it inactive instead to stop new redemptions.",
            });
        }

        await pool.query("DELETE FROM coupons WHERE id = $1 AND restaurant_id = $2", [couponId, restaurantId]);

        res.json({ message: "Coupon deleted" });
    } catch (error) {
        next(error);
    }
};
