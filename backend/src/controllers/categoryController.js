import pool from "../db/db.js";

// GET /api/admin/categories — Get all categories for the restaurant
export const getCategories = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;

        const categories = await pool.query(
            "SELECT * FROM categories WHERE restaurant_id = $1 ORDER BY display_order ASC, created_at ASC",
            [restaurantId]
        );

        res.json({ categories: categories.rows });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/categories/:id — Get single category
export const getCategoryById = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const categoryId = parseInt(req.params.id);

        if (isNaN(categoryId)) {
            return res.status(400).json({ message: "Invalid category ID" });
        }

        const category = await pool.query(
            "SELECT * FROM categories WHERE id = $1 AND restaurant_id = $2",
            [categoryId, restaurantId]
        );

        if (category.rows.length === 0) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.json({ category: category.rows[0] });
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/categories — Create a new category
export const createCategory = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const { name, description, image_url, display_order, is_active } = req.body;

        const newCategory = await pool.query(
            `INSERT INTO categories (restaurant_id, name, description, image_url, display_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
            [restaurantId, name, description || null, image_url || null, display_order || 0, is_active !== false]
        );

        res.status(201).json({ message: "Category created", category: newCategory.rows[0] });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/categories/:id — Update a category
export const updateCategory = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const categoryId = parseInt(req.params.id);

        if (isNaN(categoryId)) {
            return res.status(400).json({ message: "Invalid category ID" });
        }

        const { name, description, image_url, display_order, is_active } = req.body;

        const updated = await pool.query(
            `UPDATE categories SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        image_url = COALESCE($3, image_url),
        display_order = COALESCE($4, display_order),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
      WHERE id = $6 AND restaurant_id = $7
      RETURNING *`,
            [name, description, image_url, display_order, is_active, categoryId, restaurantId]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.json({ message: "Category updated", category: updated.rows[0] });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/categories/:id — Delete a category
export const deleteCategory = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const categoryId = parseInt(req.params.id);

        if (isNaN(categoryId)) {
            return res.status(400).json({ message: "Invalid category ID" });
        }

        // Check if category has menu items
        const items = await pool.query(
            "SELECT COUNT(*) FROM menu_items WHERE category_id = $1",
            [categoryId]
        );

        if (parseInt(items.rows[0].count) > 0) {
            return res.status(400).json({
                message: "Cannot delete category with existing menu items. Remove or reassign items first.",
            });
        }

        const deleted = await pool.query(
            "DELETE FROM categories WHERE id = $1 AND restaurant_id = $2 RETURNING id",
            [categoryId, restaurantId]
        );

        if (deleted.rows.length === 0) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.json({ message: "Category deleted" });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/categories/reorder — Reorder categories
export const reorderCategories = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const restaurantId = req.admin.restaurant_id;
        const { order } = req.body; // [{ id: 1, display_order: 0 }, { id: 2, display_order: 1 }]

        await client.query("BEGIN");

        for (const item of order) {
            await client.query(
                "UPDATE categories SET display_order = $1, updated_at = NOW() WHERE id = $2 AND restaurant_id = $3",
                [item.display_order, item.id, restaurantId]
            );
        }

        await client.query("COMMIT");

        res.json({ message: "Categories reordered" });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};
