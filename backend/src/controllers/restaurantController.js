import pool from "../db/db.js";

// GET /api/admin/restaurant — Get the admin's restaurant profile
export const getRestaurant = async (req, res) => {
    try {
        const restaurantId = req.admin.restaurant_id;

        const restaurant = await pool.query("SELECT * FROM restaurants WHERE id = $1", [restaurantId]);

        if (restaurant.rows.length === 0) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        res.json({ restaurant: restaurant.rows[0] });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// PUT /api/admin/restaurant — Update restaurant profile
export const updateRestaurant = async (req, res) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const {
            name, description, logo_url, banner_url, email, phone,
            address, city, state, postal_code, opening_time, closing_time,
            gst_number, is_active, show_home_stats,
        } = req.body;

        const updated = await pool.query(
            `UPDATE restaurants SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        logo_url = COALESCE($3, logo_url),
        banner_url = COALESCE($4, banner_url),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        address = COALESCE($7, address),
        city = COALESCE($8, city),
        state = COALESCE($9, state),
        postal_code = COALESCE($10, postal_code),
        opening_time = COALESCE($11, opening_time),
        closing_time = COALESCE($12, closing_time),
        gst_number = COALESCE($13, gst_number),
        is_active = COALESCE($14, is_active),
        show_home_stats = COALESCE($15, show_home_stats),
        updated_at = NOW()
      WHERE id = $16
      RETURNING *`,
            [
                name, description, logo_url, banner_url, email, phone,
                address, city, state, postal_code, opening_time, closing_time,
                gst_number, is_active, show_home_stats, restaurantId,
            ]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        res.json({ message: "Restaurant updated", restaurant: updated.rows[0] });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// POST /api/admin/restaurant — Create a new restaurant (first-time setup)
export const createRestaurant = async (req, res) => {
    try {
        const {
            name, description, logo_url, banner_url, email, phone,
            address, city, state, postal_code, opening_time, closing_time,
            gst_number,
        } = req.body;

        const newRestaurant = await pool.query(
            `INSERT INTO restaurants (name, description, logo_url, banner_url, email, phone, address, city, state, postal_code, opening_time, closing_time, gst_number, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, NOW(), NOW())
       RETURNING *`,
            [name, description, logo_url, banner_url, email, phone, address, city, state, postal_code, opening_time, closing_time, gst_number]
        );

        // Link the admin user to this restaurant
        await pool.query(
            "UPDATE admin_users SET restaurant_id = $1 WHERE id = $2",
            [newRestaurant.rows[0].id, req.admin.id]
        );

        res.status(201).json({ message: "Restaurant created", restaurant: newRestaurant.rows[0] });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// PUT /api/admin/restaurant/toggle — Activate/deactivate restaurant
export const toggleRestaurant = async (req, res) => {
    try {
        const restaurantId = req.admin.restaurant_id;

        const current = await pool.query("SELECT is_active FROM restaurants WHERE id = $1", [restaurantId]);

        if (current.rows.length === 0) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        const newStatus = !current.rows[0].is_active;

        await pool.query(
            "UPDATE restaurants SET is_active = $1, updated_at = NOW() WHERE id = $2",
            [newStatus, restaurantId]
        );

        res.json({ message: `Restaurant ${newStatus ? "activated" : "deactivated"}`, is_active: newStatus });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
