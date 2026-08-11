import pool from "../db/db.js";

// GET /api/admin/tables — Get all tables for the restaurant
export const getTables = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;

        const tables = await pool.query(
            "SELECT * FROM restaurant_tables WHERE restaurant_id = $1 ORDER BY table_number ASC",
            [restaurantId]
        );

        res.json({ tables: tables.rows });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/tables/:id — Get single table
export const getTableById = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const tableId = parseInt(req.params.id);

        if (isNaN(tableId)) {
            return res.status(400).json({ message: "Invalid table ID" });
        }

        const table = await pool.query(
            "SELECT * FROM restaurant_tables WHERE id = $1 AND restaurant_id = $2",
            [tableId, restaurantId]
        );

        if (table.rows.length === 0) {
            return res.status(404).json({ message: "Table not found" });
        }

        res.json({ table: table.rows[0] });
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/tables — Create a new table
export const createTable = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const { table_number, table_name, capacity, is_active } = req.body;

        // Check if table number already exists for this restaurant
        const existing = await pool.query(
            "SELECT id FROM restaurant_tables WHERE restaurant_id = $1 AND table_number = $2",
            [restaurantId, table_number]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ message: `Table number ${table_number} already exists` });
        }

        const newTable = await pool.query(
            `INSERT INTO restaurant_tables (restaurant_id, table_number, table_name, capacity, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
            [restaurantId, table_number, table_name || null, capacity || null, is_active !== false]
        );

        res.status(201).json({ message: "Table created", table: newTable.rows[0] });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/tables/:id — Update a table
export const updateTable = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const tableId = parseInt(req.params.id);

        if (isNaN(tableId)) {
            return res.status(400).json({ message: "Invalid table ID" });
        }

        const { table_number, table_name, qr_code_url, capacity, is_active } = req.body;

        // If changing table_number, check it's not taken
        if (table_number) {
            const existing = await pool.query(
                "SELECT id FROM restaurant_tables WHERE restaurant_id = $1 AND table_number = $2 AND id != $3",
                [restaurantId, table_number, tableId]
            );

            if (existing.rows.length > 0) {
                return res.status(400).json({ message: `Table number ${table_number} already exists` });
            }
        }

        const updated = await pool.query(
            `UPDATE restaurant_tables SET
        table_number = COALESCE($1, table_number),
        table_name = COALESCE($2, table_name),
        qr_code_url = COALESCE($3, qr_code_url),
        capacity = COALESCE($4, capacity),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
      WHERE id = $6 AND restaurant_id = $7
      RETURNING *`,
            [table_number, table_name, qr_code_url, capacity, is_active, tableId, restaurantId]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: "Table not found" });
        }

        res.json({ message: "Table updated", table: updated.rows[0] });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/tables/:id — Delete a table
export const deleteTable = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const tableId = parseInt(req.params.id);

        if (isNaN(tableId)) {
            return res.status(400).json({ message: "Invalid table ID" });
        }

        const deleted = await pool.query(
            "DELETE FROM restaurant_tables WHERE id = $1 AND restaurant_id = $2 RETURNING id",
            [tableId, restaurantId]
        );

        if (deleted.rows.length === 0) {
            return res.status(404).json({ message: "Table not found" });
        }

        res.json({ message: "Table deleted" });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/tables/:id/toggle — Enable/disable table
export const toggleTable = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const tableId = parseInt(req.params.id);

        if (isNaN(tableId)) {
            return res.status(400).json({ message: "Invalid table ID" });
        }

        const current = await pool.query(
            "SELECT is_active FROM restaurant_tables WHERE id = $1 AND restaurant_id = $2",
            [tableId, restaurantId]
        );

        if (current.rows.length === 0) {
            return res.status(404).json({ message: "Table not found" });
        }

        const newStatus = !current.rows[0].is_active;

        await pool.query(
            "UPDATE restaurant_tables SET is_active = $1, updated_at = NOW() WHERE id = $2 AND restaurant_id = $3",
            [newStatus, tableId, restaurantId]
        );

        res.json({ message: `Table ${newStatus ? "enabled" : "disabled"}`, is_active: newStatus });
    } catch (error) {
        next(error);
    }
};
