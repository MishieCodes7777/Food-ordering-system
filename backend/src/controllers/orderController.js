import pool from "../db/db.js";
import razorpay from "../config/razorpay.js";
import logger from "../utils/logger.js";
import { evaluateCoupon } from "../utils/couponUtils.js";

// POST /api/orders/place — Place order from cart
export const placeOrder = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const couponCode = req.body?.coupon_code?.trim() || null;

    await client.query("BEGIN");

    // Get user's cart (locked so a concurrent addToCart/placeOrder can't race this one)
    const cart = await client.query("SELECT id FROM carts WHERE user_id = $1 FOR UPDATE", [userId]);
    if (cart.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cart not found" });
    }

    const cartId = cart.rows[0].id;

    // Get cart items
    const cartItems = await client.query(
      "SELECT menu_item_id, quantity, food_type_choice FROM cart_items WHERE cart_id = $1",
      [cartId]
    );

    if (cartItems.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Get prices for each menu item and calculate total
    const menuItemIds = cartItems.rows.map((item) => item.menu_item_id);
    const menuItems = await client.query(
      "SELECT id, price, restaurant_id FROM menu_items WHERE id = ANY($1)",
      [menuItemIds]
    );

    // Build a price map and verify every item belongs to the same restaurant
    const priceMap = {};
    let restaurantId = null;
    let mixedRestaurants = false;
    for (const item of menuItems.rows) {
      priceMap[item.id] = parseFloat(item.price);
      if (restaurantId === null) {
        restaurantId = item.restaurant_id;
      } else if (restaurantId !== item.restaurant_id) {
        mixedRestaurants = true;
      }
    }

    if (mixedRestaurants) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Cart contains items from multiple restaurants. Please clear your cart and try again.",
      });
    }

    // Verify all items have prices (exist in menu)
    for (const cartItem of cartItems.rows) {
      if (priceMap[cartItem.menu_item_id] === undefined) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Menu item ${cartItem.menu_item_id} not found or unavailable`,
        });
      }
    }

    // Calculate total
    let subtotal = 0;
    for (const cartItem of cartItems.rows) {
      subtotal += priceMap[cartItem.menu_item_id] * cartItem.quantity;
    }

    // Apply a coupon if one was supplied — re-evaluated here against the
    // authoritative server-computed subtotal, never trusting a client-sent
    // discount amount. Rejects the whole placement rather than silently
    // ignoring a bad code, so the customer isn't charged more than expected.
    let discountAmount = 0;
    let appliedCoupon = null;
    let normalizedCouponCode = null;
    if (couponCode) {
      const couponResult = await evaluateCoupon(client, restaurantId, couponCode, subtotal, userId);
      if (!couponResult.valid) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: couponResult.message });
      }
      discountAmount = couponResult.discount_amount;
      appliedCoupon = couponResult.coupon;
      normalizedCouponCode = appliedCoupon.code;
    }
    const totalAmount = subtotal - discountAmount;

    // Create order
    const order = await client.query(
      `INSERT INTO orders (user_id, restaurant_id, total_amount, coupon_code, discount_amount, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW()) RETURNING *`,
      [userId, restaurantId, totalAmount, normalizedCouponCode, discountAmount]
    );

    const orderId = order.rows[0].id;

    if (appliedCoupon) {
      await client.query(
        "INSERT INTO coupon_redemptions (coupon_id, user_id, order_id, discount_amount, created_at) VALUES ($1, $2, $3, $4, NOW())",
        [appliedCoupon.id, userId, orderId, discountAmount]
      );
      await client.query(
        "UPDATE coupons SET used_count = used_count + 1, updated_at = NOW() WHERE id = $1",
        [appliedCoupon.id]
      );
    }

    // Copy cart items to order items (with price snapshot)
    for (const cartItem of cartItems.rows) {
      await client.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity, price, food_type_choice, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())",
        [orderId, cartItem.menu_item_id, cartItem.quantity, priceMap[cartItem.menu_item_id], cartItem.food_type_choice]
      );
    }

    // Clear the cart
    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);
    await client.query("UPDATE carts SET updated_at = NOW() WHERE id = $1", [cartId]);

    await client.query("COMMIT");

    res.status(201).json({
      message: "Order placed successfully",
      order: order.rows[0],
      items_count: cartItems.rows.length,
      total_amount: totalAmount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// GET /api/orders — Get user's order history (paginated)
export const getOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    const orders = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [userId, limit, offset]
    );

    // Batch-fetch items for every order on this page in one query instead of one query per order
    const orderIds = orders.rows.map((order) => order.id);
    let itemsByOrderId = {};
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
    }

    const ordersWithItems = orders.rows.map((order) => ({
      ...order,
      items: itemsByOrderId[order.id] || [],
    }));

    res.json({ orders: ordersWithItems, page, limit });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/recent-items — Up to 5 distinct menu items this user has
// ordered before (most recently ordered first), for a "reorder" shortcut.
// Empty array for a user with no qualifying order history — the frontend
// treats that as "hide the section" rather than needing a separate flag.
export const getRecentlyOrderedItems = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM (
         SELECT DISTINCT ON (mi.id)
           mi.id, mi.name, mi.description, mi.price, mi.discount_price,
           mi.image_url, mi.is_veg, mi.food_type, mi.preparation_time,
           oi.created_at AS last_ordered_at
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE o.user_id = $1 AND o.status != 'cancelled' AND mi.is_available = TRUE
         ORDER BY mi.id, oi.created_at DESC
       ) recent
       ORDER BY last_ordered_at DESC
       LIMIT 5`,
      [userId]
    );

    res.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/:orderId — Get single order with items
export const getOrderById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    // Get order (verify ownership)
    const order = await pool.query(
      "SELECT * FROM orders WHERE id = $1 AND user_id = $2",
      [orderId, userId]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Get order items
    const items = await pool.query(
      "SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC",
      [orderId]
    );

    res.json({ order: order.rows[0], items: items.rows });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/:orderId/status — Get order status
export const getOrderStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await pool.query(
      "SELECT id, status, created_at, updated_at FROM orders WHERE id = $1 AND user_id = $2",
      [orderId, userId]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ order_id: orderId, status: order.rows[0].status, updated_at: order.rows[0].updated_at });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/:orderId/cancel — Cancel order and restore items to cart
export const cancelOrder = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    await client.query("BEGIN");

    // Get order (verify ownership and status) — locked so a concurrent
    // cancel/refund request on the same order blocks until this commits
    const order = await client.query(
      "SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [orderId, userId]
    );

    if (order.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    // Only allow cancellation of pending orders
    if (order.rows[0].status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Cannot cancel order with status '${order.rows[0].status}'. Only pending orders can be cancelled.`,
      });
    }

    // Get order items to restore to cart
    const orderItems = await client.query(
      "SELECT menu_item_id, quantity FROM order_items WHERE order_id = $1",
      [orderId]
    );

    // Get or create user's cart (locked so a concurrent addToCart/placeOrder can't race this one)
    let cart = await client.query("SELECT id FROM carts WHERE user_id = $1 FOR UPDATE", [userId]);
    if (cart.rows.length === 0) {
      cart = await client.query(
        "INSERT INTO carts (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id",
        [userId]
      );
    }
    const cartId = cart.rows[0].id;

    // Restore items back to cart (upsert — add to existing quantity if item already in cart)
    for (const item of orderItems.rows) {
      const existing = await client.query(
        "SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND menu_item_id = $2",
        [cartId, item.menu_item_id]
      );

      if (existing.rows.length > 0) {
        await client.query(
          "UPDATE cart_items SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2",
          [item.quantity, existing.rows[0].id]
        );
      } else {
        await client.query(
          "INSERT INTO cart_items (cart_id, menu_item_id, quantity, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
          [cartId, item.menu_item_id, item.quantity]
        );
      }
    }

    // Update order status to cancelled
    await client.query(
      "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [orderId]
    );

    // Update cart timestamp
    await client.query("UPDATE carts SET updated_at = NOW() WHERE id = $1", [cartId]);

    // If payment was already captured, auto-refund it so cash doesn't stay stranded.
    // Locked so a concurrent admin cancel/refund on the same payment can't double-trigger Razorpay.
    let refunded = false;
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
        refunded = true;
      } catch (refundErr) {
        logger.error({
          requestId: req.id,
          orderId,
          paymentId: payment.rows[0].id,
          userId,
          err: { message: refundErr.message },
        }, "Auto-refund failed during customer order cancellation");
        // Still cancel the order even if refund fails — admin can manually refund
      }
    }

    await client.query("COMMIT");

    res.json({
      message: refunded
        ? "Order cancelled, items restored to cart, and payment refunded"
        : "Order cancelled, items restored to cart",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};
