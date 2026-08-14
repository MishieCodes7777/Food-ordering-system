import pool from "../db/db.js";

// GET /api/admin/menu-items — Get all menu items for the restaurant
export const getMenuItems = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;

        // Optional filter by category
        const categoryId = req.query.category_id ? parseInt(req.query.category_id) : null;

        let query = `
      SELECT mi.*, c.name as category_name
      FROM menu_items mi
      JOIN categories c ON mi.category_id = c.id
      WHERE mi.restaurant_id = $1
    `;
        const params = [restaurantId];

        if (categoryId) {
            query += " AND mi.category_id = $2";
            params.push(categoryId);
        }

        // Defensive cap, not real pagination — admins manage their whole catalog
        // at once in this UI, so paging it would hurt the workflow for no benefit
        // at this app's realistic scale.
        query += " ORDER BY mi.display_order ASC, mi.created_at DESC LIMIT 500";

        const items = await pool.query(query, params);

        res.json({ menu_items: items.rows });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/menu-items/:id — Get single menu item with images
export const getMenuItemById = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const itemId = parseInt(req.params.id);

        if (isNaN(itemId)) {
            return res.status(400).json({ message: "Invalid menu item ID" });
        }

        const item = await pool.query(
            `SELECT mi.*, c.name as category_name
       FROM menu_items mi
       JOIN categories c ON mi.category_id = c.id
       WHERE mi.id = $1 AND mi.restaurant_id = $2`,
            [itemId, restaurantId]
        );

        if (item.rows.length === 0) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        // Get additional images
        const images = await pool.query(
            "SELECT id, image_url, created_at FROM menu_item_images WHERE menu_item_id = $1 ORDER BY created_at ASC",
            [itemId]
        );

        res.json({ menu_item: item.rows[0], images: images.rows });
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/menu-items — Create a new menu item
export const createMenuItem = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const {
            category_id, name, description, price, discount_price,
            image_url, is_veg, is_available, preparation_time, calories, display_order,
        } = req.body;

        // Verify category belongs to this restaurant
        const category = await pool.query(
            "SELECT id FROM categories WHERE id = $1 AND restaurant_id = $2",
            [category_id, restaurantId]
        );

        if (category.rows.length === 0) {
            return res.status(400).json({ message: "Category not found in your restaurant" });
        }

        const newItem = await pool.query(
            `INSERT INTO menu_items (restaurant_id, category_id, name, description, price, discount_price, image_url, is_veg, food_type, is_available, preparation_time, calories, display_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING *`,
            [
                restaurantId, category_id, name, description || null, price,
                discount_price || null, image_url || null, is_veg || false,
                req.body.food_type || (is_veg ? "veg" : "non-veg"),
                is_available !== false, preparation_time || null, calories || null,
                display_order || 0,
            ]
        );

        res.status(201).json({ message: "Menu item created", menu_item: newItem.rows[0] });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/menu-items/:id — Update a menu item
export const updateMenuItem = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const itemId = parseInt(req.params.id);

        if (isNaN(itemId)) {
            return res.status(400).json({ message: "Invalid menu item ID" });
        }

        const {
            category_id, name, description, price, discount_price,
            image_url, is_veg, is_available, preparation_time, calories, display_order,
        } = req.body;

        // If category_id is being changed, verify it belongs to this restaurant
        if (category_id) {
            const category = await pool.query(
                "SELECT id FROM categories WHERE id = $1 AND restaurant_id = $2",
                [category_id, restaurantId]
            );

            if (category.rows.length === 0) {
                return res.status(400).json({ message: "Category not found in your restaurant" });
            }
        }

        const updated = await pool.query(
            `UPDATE menu_items SET
        category_id = COALESCE($1, category_id),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        price = COALESCE($4, price),
        discount_price = COALESCE($5, discount_price),
        image_url = COALESCE($6, image_url),
        is_veg = COALESCE($7, is_veg),
        is_available = COALESCE($8, is_available),
        preparation_time = COALESCE($9, preparation_time),
        calories = COALESCE($10, calories),
        display_order = COALESCE($11, display_order),
        updated_at = NOW()
      WHERE id = $12 AND restaurant_id = $13
      RETURNING *`,
            [
                category_id, name, description, price, discount_price,
                image_url, is_veg, is_available, preparation_time, calories,
                display_order, itemId, restaurantId,
            ]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        res.json({ message: "Menu item updated", menu_item: updated.rows[0] });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/menu-items/:id — Delete a menu item
export const deleteMenuItem = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const itemId = parseInt(req.params.id);

        if (isNaN(itemId)) {
            return res.status(400).json({ message: "Invalid menu item ID" });
        }

        const deleted = await pool.query(
            "DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING id",
            [itemId, restaurantId]
        );

        if (deleted.rows.length === 0) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        res.json({ message: "Menu item deleted" });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/menu-items/:id/availability — Toggle availability
export const toggleAvailability = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const itemId = parseInt(req.params.id);

        if (isNaN(itemId)) {
            return res.status(400).json({ message: "Invalid menu item ID" });
        }

        const current = await pool.query(
            "SELECT is_available FROM menu_items WHERE id = $1 AND restaurant_id = $2",
            [itemId, restaurantId]
        );

        if (current.rows.length === 0) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        const newStatus = !current.rows[0].is_available;

        await pool.query(
            "UPDATE menu_items SET is_available = $1, updated_at = NOW() WHERE id = $2 AND restaurant_id = $3",
            [newStatus, itemId, restaurantId]
        );

        res.json({ message: `Item marked as ${newStatus ? "available" : "unavailable"}`, is_available: newStatus });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/menu-items/:id/featured — Toggle featured status
export const toggleFeatured = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const itemId = parseInt(req.params.id);

        if (isNaN(itemId)) {
            return res.status(400).json({ message: "Invalid menu item ID" });
        }

        const current = await pool.query(
            "SELECT is_featured FROM menu_items WHERE id = $1 AND restaurant_id = $2",
            [itemId, restaurantId]
        );

        if (current.rows.length === 0) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        const newStatus = !current.rows[0].is_featured;

        await pool.query(
            "UPDATE menu_items SET is_featured = $1, updated_at = NOW() WHERE id = $2 AND restaurant_id = $3",
            [newStatus, itemId, restaurantId]
        );

        res.json({ message: `Item ${newStatus ? "added to" : "removed from"} featured`, is_featured: newStatus });
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/menu-items/:id/images — Add image to menu item
export const addMenuItemImage = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const itemId = parseInt(req.params.id);
        const { image_url } = req.body;

        if (isNaN(itemId)) {
            return res.status(400).json({ message: "Invalid menu item ID" });
        }

        // Verify item belongs to restaurant
        const item = await pool.query(
            "SELECT id FROM menu_items WHERE id = $1 AND restaurant_id = $2",
            [itemId, restaurantId]
        );

        if (item.rows.length === 0) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        const newImage = await pool.query(
            "INSERT INTO menu_item_images (menu_item_id, image_url, created_at) VALUES ($1, $2, NOW()) RETURNING *",
            [itemId, image_url]
        );

        res.status(201).json({ message: "Image added", image: newImage.rows[0] });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/menu-items/:id/images/:imageId — Remove image from menu item
export const removeMenuItemImage = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const itemId = parseInt(req.params.id);
        const imageId = parseInt(req.params.imageId);

        if (isNaN(itemId) || isNaN(imageId)) {
            return res.status(400).json({ message: "Invalid ID" });
        }

        // Verify item belongs to restaurant
        const item = await pool.query(
            "SELECT id FROM menu_items WHERE id = $1 AND restaurant_id = $2",
            [itemId, restaurantId]
        );

        if (item.rows.length === 0) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        const deleted = await pool.query(
            "DELETE FROM menu_item_images WHERE id = $1 AND menu_item_id = $2 RETURNING id",
            [imageId, itemId]
        );

        if (deleted.rows.length === 0) {
            return res.status(404).json({ message: "Image not found" });
        }

        res.json({ message: "Image removed" });
    } catch (error) {
        next(error);
    }
};
