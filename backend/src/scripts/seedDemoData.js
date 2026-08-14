// One-off script to populate the local dev DB with realistic-looking demo
// data (customers, tables, and ~45 days of orders/payments) so the admin
// panel has real content to browse instead of a near-empty test DB. Also
// sweeps out synthetic rows left behind by the backend test suite, which
// runs against this same DB (see tests/helpers.js — "Gating Test", "Pay
// Test", etc.) rather than a separate test DB.
//
// Usage: node src/scripts/seedDemoData.js
import bcrypt from "bcrypt";
import pool from "../db/db.js";

const RESTAURANT_ID = 1;

const DEMO_CUSTOMERS = [
    { name: "Aarav Sharma", phone: "9811122334" },
    { name: "Priya Nair", phone: "9822233445" },
    { name: "Rohan Mehta", phone: "9833344556" },
    { name: "Ishita Kapoor", phone: "9844455667" },
    { name: "Vikram Singh", phone: "9855566778" },
    { name: "Ananya Iyer", phone: "9866677889" },
    { name: "Karan Malhotra", phone: "9877788990" },
    { name: "Sneha Reddy", phone: "9888899001" },
    { name: "Aditya Verma", phone: "9899900112" },
    { name: "Meera Joshi", phone: "9800011223" },
];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const randomId = (len = 14) => Array.from({ length: len }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[randInt(0, 35)]).join("");

async function main() {
    // ---- 1. Sweep out test-suite junk (names the suite hard-codes) ----
    const junk = await pool.query(
        `SELECT id FROM users WHERE name ILIKE '%Test%'`
    );
    const junkIds = junk.rows.map((r) => r.id);
    if (junkIds.length > 0) {
        await pool.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ANY($1))`, [junkIds]);
        await pool.query(`DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id = ANY($1))`, [junkIds]);
        await pool.query(`DELETE FROM orders WHERE user_id = ANY($1)`, [junkIds]);
        await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [junkIds]);
        console.log(`Cleaned up ${junkIds.length} test-suite user(s) and their orders/payments`);
    }

    // ---- 2. Seed demo customers (skip any that already exist by phone) ----
    const passwordHash = await bcrypt.hash("Demo@1234", await bcrypt.genSalt(12));
    const customerIds = [];
    for (const c of DEMO_CUSTOMERS) {
        const existing = await pool.query("SELECT id FROM users WHERE phone = $1", [c.phone]);
        if (existing.rows.length > 0) {
            customerIds.push(existing.rows[0].id);
            continue;
        }
        const email = `${c.name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
        const inserted = await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, phone_verified, created_at, updated_at)
             VALUES ($1, $2, $3, $4, TRUE, NOW() - INTERVAL '1 day' * $5, NOW())
             RETURNING id`,
            [c.name, email, c.phone, passwordHash, randInt(30, 200)]
        );
        customerIds.push(inserted.rows[0].id);
    }
    // Fold in any existing real (non-test) users too, e.g. the admin's own test account
    const realExisting = await pool.query(
        `SELECT id FROM users WHERE name NOT ILIKE '%Test%' AND id != ALL($1)`,
        [customerIds]
    );
    for (const row of realExisting.rows) customerIds.push(row.id);
    console.log(`${customerIds.length} customers available for seeding orders`);

    // ---- 3. Seed a few dine-in tables if none exist ----
    const tableCount = await pool.query("SELECT COUNT(*) FROM restaurant_tables WHERE restaurant_id = $1", [RESTAURANT_ID]);
    if (parseInt(tableCount.rows[0].count) === 0) {
        for (let i = 1; i <= 6; i++) {
            await pool.query(
                `INSERT INTO restaurant_tables (restaurant_id, table_number, table_name, capacity, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())`,
                [RESTAURANT_ID, i, `Table ${i}`, pick([2, 2, 4, 4, 6])]
            );
        }
        console.log("Seeded 6 restaurant tables");
    }

    // ---- 4. Seed menu items to order from (available ones only) ----
    const menuItems = (await pool.query(
        "SELECT id, price FROM menu_items WHERE restaurant_id = $1 AND is_available = TRUE",
        [RESTAURANT_ID]
    )).rows;
    if (menuItems.length === 0) {
        console.log("No available menu items found — skipping order seeding");
        await pool.end();
        return;
    }

    // ---- 5. Seed ~45 days of orders, weighted realistically by status ----
    let ordersCreated = 0;
    for (let dayOffset = 45; dayOffset >= 0; dayOffset--) {
        const ordersToday = randInt(1, 5);
        for (let i = 0; i < ordersToday; i++) {
            const isRecent = dayOffset <= 1;
            // A handful of "live" in-flight orders only for today/yesterday —
            // older days are always resolved one way or another.
            const status = isRecent && Math.random() < 0.3
                ? pick(["pending", "accepted", "preparing", "ready"])
                : Math.random() < 0.85 ? "completed" : "cancelled";

            const itemCount = randInt(1, 3);
            const orderItems = Array.from({ length: itemCount }, () => {
                const item = pick(menuItems);
                return { menu_item_id: item.id, quantity: randInt(1, 3), price: parseFloat(item.price) };
            });
            const totalAmount = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

            const createdAt = `NOW() - INTERVAL '1 day' * ${dayOffset} + INTERVAL '1 hour' * ${randInt(11, 22)} + INTERVAL '1 minute' * ${randInt(0, 59)}`;
            const userId = pick(customerIds);

            const orderResult = await pool.query(
                `INSERT INTO orders (user_id, restaurant_id, total_amount, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, ${createdAt}, ${createdAt})
                 RETURNING id, created_at`,
                [userId, RESTAURANT_ID, totalAmount, status]
            );
            const orderId = orderResult.rows[0].id;

            for (const it of orderItems) {
                await pool.query(
                    `INSERT INTO order_items (order_id, menu_item_id, quantity, price, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, ${createdAt}, ${createdAt})`,
                    [orderId, it.menu_item_id, it.quantity, it.price]
                );
            }

            // Payment status follows from order status, matching the app's
            // real cancel-auto-refunds / pay-before-fulfillment logic.
            let paymentStatus;
            if (status === "completed") paymentStatus = Math.random() < 0.9 ? "completed" : "refunded";
            else if (status === "cancelled") paymentStatus = Math.random() < 0.7 ? "refunded" : "failed";
            else paymentStatus = Math.random() < 0.85 ? "completed" : "pending";

            const txnId = paymentStatus === "pending" ? `order_${randomId(16)}` : `pay_${randomId(14)}`;

            await pool.query(
                `INSERT INTO payments (order_id, amount, payment_method, payment_status, transaction_id, created_at, updated_at)
                 VALUES ($1, $2, 'RAZORPAY', $3, $4, ${createdAt}, ${createdAt})`,
                [orderId, totalAmount, paymentStatus, txnId]
            );

            ordersCreated++;
        }
    }

    console.log(`Seeded ${ordersCreated} orders with items and payments across the last 45 days`);
    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
