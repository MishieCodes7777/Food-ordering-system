import pool from "../db/db.js";
import razorpay from "../config/razorpay.js";
import logger from "../utils/logger.js";
import { sendOrderReadySms } from "../config/msg91.js";

// GET /api/admin/orders — Get all orders for the restaurant (paginated)
export const getRestaurantOrders = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;

        // Optional status filter
        const status = req.query.status || null;
        // CSV export needs the full filtered set in one call, not just a page —
        // export requests get a much higher ceiling than normal table paging.
        const maxLimit = req.query.export === "true" ? 5000 : 50;
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), maxLimit);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const offset = (page - 1) * limit;

        let query = `
      SELECT o.*, u.name as customer_name, u.phone as customer_phone, u.created_at as customer_since,
             COUNT(*) OVER() AS total_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.restaurant_id = $1
    `;
        const params = [restaurantId];

        if (status) {
            params.push(status);
            query += ` AND o.status = $${params.length}`;
        }

        params.push(limit, offset);
        query += ` ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const orders = await pool.query(query, params);
        const totalCount = orders.rows[0]?.total_count ? parseInt(orders.rows[0].total_count) : 0;

        // Batch-fetch items and latest payment per order in 2 queries instead of 2 per order
        const orderIds = orders.rows.map((order) => order.id);
        let itemsByOrderId = {};
        let paymentByOrderId = {};

        if (orderIds.length > 0) {
            const items = await pool.query(
                `SELECT oi.order_id, oi.menu_item_id, oi.quantity, oi.price, mi.name
                 FROM order_items oi
                 LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
                 WHERE oi.order_id = ANY($1)`,
                [orderIds]
            );
            itemsByOrderId = items.rows.reduce((acc, item) => {
                (acc[item.order_id] ||= []).push(item);
                return acc;
            }, {});

            const payments = await pool.query(
                `SELECT DISTINCT ON (order_id) order_id, payment_status, payment_method, transaction_id
                 FROM payments
                 WHERE order_id = ANY($1)
                 ORDER BY order_id, created_at DESC`,
                [orderIds]
            );
            paymentByOrderId = payments.rows.reduce((acc, payment) => {
                acc[payment.order_id] = payment;
                return acc;
            }, {});
        }

        const ordersWithItems = orders.rows.map(({ total_count, ...order }) => ({
            ...order,
            items: itemsByOrderId[order.id] || [],
            payment: paymentByOrderId[order.id] || null,
        }));

        res.json({ orders: ordersWithItems, page, limit, total: totalCount });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/orders/:orderId — Get order details with items
export const getOrderDetails = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const orderId = parseInt(req.params.orderId);

        if (isNaN(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await pool.query(
            `SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = $1 AND o.restaurant_id = $2`,
            [orderId, restaurantId]
        );

        if (order.rows.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Get order items with menu item names
        const items = await pool.query(
            `SELECT oi.*, mi.name as item_name, mi.image_url
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1`,
            [orderId]
        );

        // Get payment info
        const payment = await pool.query(
            "SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1",
            [orderId]
        );

        // Get status history
        const statusHistory = await pool.query(
            "SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC",
            [orderId]
        );

        res.json({
            order: order.rows[0],
            items: items.rows,
            payment: payment.rows.length > 0 ? payment.rows[0] : null,
            status_history: statusHistory.rows,
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/orders/:orderId/status — Update order status
export const updateOrderStatus = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const restaurantId = req.admin.restaurant_id;
        const orderId = parseInt(req.params.orderId);
        const { status, remarks } = req.body;

        if (isNaN(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        await client.query("BEGIN");

        // Verify order belongs to this restaurant — locked so a concurrent
        // status update/cancel on the same order blocks until this commits
        const order = await client.query(
            "SELECT id, status, user_id FROM orders WHERE id = $1 AND restaurant_id = $2 FOR UPDATE",
            [orderId, restaurantId]
        );

        if (order.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Order not found" });
        }

        // Update order status
        await client.query(
            "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND restaurant_id = $3",
            [status, orderId, restaurantId]
        );

        // Record in status history
        await client.query(
            "INSERT INTO order_status_history (order_id, status, changed_by, remarks, created_at) VALUES ($1, $2, $3, $4, NOW())",
            [orderId, status, req.admin.name, remarks || null]
        );

        // If cancelled, auto-refund the payment. Locked so a concurrent customer
        // self-refund or another admin request on the same payment can't double-trigger Razorpay.
        if (status === "cancelled") {
            const payment = await client.query(
                "SELECT * FROM payments WHERE order_id = $1 AND payment_status = 'completed' ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
                [orderId]
            );

            if (payment.rows.length > 0) {
                const paymentId = payment.rows[0].transaction_id;
                const amount = Math.round(parseFloat(payment.rows[0].amount) * 100); // paise

                try {
                    await razorpay.payments.refund(paymentId, { amount });
                    await client.query(
                        "UPDATE payments SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1",
                        [payment.rows[0].id]
                    );
                } catch (refundErr) {
                    logger.error({
                        requestId: req.id,
                        orderId,
                        paymentId: payment.rows[0].id,
                        adminId: req.admin.id,
                        err: { message: refundErr.message },
                    }, "Auto-refund failed during admin order cancellation");
                    // Still cancel the order even if refund fails — admin can manually refund
                }
            }
        }

        await client.query("COMMIT");

        // Text the customer once their order is ready to collect — best-effort,
        // doesn't fail the status update if the SMS provider is down/misconfigured.
        if (status === "ready") {
            try {
                const customer = await pool.query("SELECT name, phone FROM users WHERE id = $1", [order.rows[0].user_id]);
                if (customer.rows[0]?.phone) {
                    await sendOrderReadySms(customer.rows[0].phone, { customerName: customer.rows[0].name, orderId });
                }
            } catch (smsErr) {
                logger.error({
                    requestId: req.id,
                    orderId,
                    adminId: req.admin.id,
                    err: { message: smsErr.message },
                }, "Order-ready SMS failed to send");
            }
        }

        res.json({ message: `Order status updated to '${status}'`, order_id: orderId, status });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};
