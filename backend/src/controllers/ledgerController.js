import pool from "../db/db.js";

// Column names can't be parameterized in SQL, so sort input is mapped
// through this whitelist rather than interpolated directly.
const SORT_COLUMNS = {
    date: "p.created_at",
    amount: "p.amount",
    status: "p.payment_status",
};

// GET /api/admin/ledger — paginated payment transactions for the restaurant
export const getLedger = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        // CSV export needs the full filtered set in one call, not just a page —
        // export requests get a much higher ceiling than normal table paging.
        const maxLimit = req.query.export === "true" ? 5000 : 100;
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), maxLimit);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const offset = (page - 1) * limit;
        const search = req.query.search?.trim();
        const status = req.query.status;
        const sortBy = SORT_COLUMNS[req.query.sortBy] || SORT_COLUMNS.date;
        const sortDir = req.query.sortDir === "asc" ? "ASC" : "DESC";

        const conditions = ["o.restaurant_id = $1"];
        const params = [restaurantId];

        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(p.transaction_id ILIKE $${params.length} OR CAST(p.order_id AS TEXT) ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
        }

        if (status) {
            params.push(status);
            conditions.push(`p.payment_status = $${params.length}`);
        }

        params.push(limit, offset);

        const query = `
            SELECT p.id, p.order_id, p.amount, p.payment_method, p.payment_status, p.transaction_id, p.created_at,
                   u.name AS customer_name,
                   COUNT(*) OVER() AS total_count
            FROM payments p
            JOIN orders o ON p.order_id = o.id
            JOIN users u ON o.user_id = u.id
            WHERE ${conditions.join(" AND ")}
            ORDER BY ${sortBy} ${sortDir}
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `;

        const result = await pool.query(query, params);
        const totalCount = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count) : 0;
        const transactions = result.rows.map(({ total_count, ...row }) => row);

        res.json({ transactions, page, limit, total: totalCount });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/ledger/summary — totals for the stat cards
export const getLedgerSummary = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;

        const result = await pool.query(
            `SELECT
                COUNT(*) AS total_transactions,
                COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.amount ELSE 0 END), 0) AS total_received,
                COALESCE(SUM(CASE WHEN p.payment_status = 'refunded' THEN p.amount ELSE 0 END), 0) AS total_refunded
             FROM payments p
             JOIN orders o ON p.order_id = o.id
             WHERE o.restaurant_id = $1`,
            [restaurantId]
        );

        const row = result.rows[0];
        const totalReceived = parseFloat(row.total_received);
        const totalRefunded = parseFloat(row.total_refunded);

        res.json({
            total_transactions: parseInt(row.total_transactions),
            total_received: totalReceived,
            total_refunded: totalRefunded,
            net_revenue: totalReceived - totalRefunded,
        });
    } catch (error) {
        next(error);
    }
};
