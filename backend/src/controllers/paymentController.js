import crypto from "crypto";
import pool from "../db/db.js";
import razorpay from "../config/razorpay.js";
import logger from "../utils/logger.js";

// POST /api/payments/create-order — Create Razorpay order for a placed order
export const createPaymentOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { order_id } = req.body;

    // Verify the order exists and belongs to this user
    const order = await pool.query(
      "SELECT id, status, total_amount FROM orders WHERE id = $1 AND user_id = $2",
      [order_id, userId]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Prevent paying for non-pending orders
    if (order.rows[0].status !== "pending") {
      return res.status(400).json({
        message: `Order is already '${order.rows[0].status}'. Cannot initiate payment.`,
      });
    }

    // Check if payment already exists for this order
    const existingPayment = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1 AND payment_status = 'completed'",
      [order_id]
    );

    if (existingPayment.rows.length > 0) {
      return res.status(400).json({ message: "Payment already completed for this order" });
    }

    const amount = parseFloat(order.rows[0].total_amount);

    // Create Razorpay order (amount in paise)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `order_${order_id}_${Date.now()}`,
      notes: {
        order_id: order_id.toString(),
        user_id: userId.toString(),
      },
    });

    // Store pending payment record
    await pool.query(
      "INSERT INTO payments (order_id, amount, payment_method, payment_status, transaction_id, created_at, updated_at) VALUES ($1, $2, 'RAZORPAY', 'pending', $3, NOW(), NOW())",
      [order_id, amount, razorpayOrder.id]
    );

    res.json({
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    logger.error({ requestId: req.id, orderId: req.body?.order_id, userId: req.user?.id, err: { message: error.message } }, "[PAYMENT CREATE ERROR]");
    next(error);
  }
};

// POST /api/payments/verify — Verify Razorpay payment signature (called after frontend payment)
export const verifyPayment = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    // Verify signature using HMAC SHA256
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const providedBuffer = Buffer.from(razorpay_signature || "", "hex");
    const generatedBuffer = Buffer.from(generatedSignature, "hex");
    const signatureValid =
      providedBuffer.length === generatedBuffer.length &&
      crypto.timingSafeEqual(providedBuffer, generatedBuffer);

    if (!signatureValid) {
      return res.status(400).json({ message: "Payment verification failed. Invalid signature." });
    }

    await client.query("BEGIN");

    // Verify order belongs to user
    const order = await client.query(
      "SELECT id FROM orders WHERE id = $1 AND user_id = $2",
      [order_id, userId]
    );

    if (order.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    // Update payment record
    await client.query(
      "UPDATE payments SET payment_status = 'completed', transaction_id = $1, updated_at = NOW() WHERE order_id = $2 AND transaction_id = $3",
      [razorpay_payment_id, order_id, razorpay_order_id]
    );

    // Order stays pending — admin will accept/confirm it manually
    // Payment is recorded as completed but order status doesn't change

    await client.query("COMMIT");

    res.json({ message: "Payment verified and order confirmed", order_id });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// GET /api/payments/:orderId — Get payment status for an order
export const getPaymentStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    // Verify order belongs to user
    const order = await pool.query(
      "SELECT id FROM orders WHERE id = $1 AND user_id = $2",
      [orderId, userId]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const payment = await pool.query(
      "SELECT id, amount, payment_method, payment_status, transaction_id, created_at FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1",
      [orderId]
    );

    if (payment.rows.length === 0) {
      return res.json({ payment: null, message: "No payment initiated for this order" });
    }

    res.json({ payment: payment.rows[0] });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/refund — Refund a completed payment (for cancelled orders)
export const refundPayment = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { order_id } = req.body;

    await client.query("BEGIN");

    // Verify order belongs to user — locked so a concurrent cancel/refund
    // request on the same order blocks until this commits
    const order = await client.query(
      "SELECT id, status FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [order_id, userId]
    );

    if (order.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    // Only pending (not yet accepted/prepared/delivered) orders can be self-refunded
    if (order.rows[0].status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Cannot refund order with status '${order.rows[0].status}'. Only pending orders can be refunded.`,
      });
    }

    // Get completed payment — locked so a concurrent admin cancel/refund
    // on the same payment can't double-trigger Razorpay
    const payment = await client.query(
      "SELECT id, transaction_id, amount FROM payments WHERE order_id = $1 AND payment_status = 'completed' ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
      [order_id]
    );

    if (payment.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No completed payment found for this order" });
    }

    const paymentId = payment.rows[0].transaction_id;

    // Initiate refund via Razorpay (held inside the lock so a concurrent
    // request against the same order/payment blocks until this commits)
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(parseFloat(payment.rows[0].amount) * 100),
      notes: {
        reason: "Customer requested cancellation",
        order_id: order_id.toString(),
      },
    });

    // Update payment status
    await client.query(
      "UPDATE payments SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1",
      [payment.rows[0].id]
    );

    // Update order status
    await client.query(
      "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [order_id]
    );

    await client.query("COMMIT");

    res.json({
      message: "Refund initiated successfully",
      refund_id: refund.id,
      amount: parseFloat(payment.rows[0].amount),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};
