import crypto from "crypto";
import pool from "../db/db.js";
import logger from "../utils/logger.js";

// POST /api/webhooks/razorpay — Razorpay sends payment events here
export const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const signature = req.headers["x-razorpay-signature"];
    const body = req.body.toString();

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature || "", "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const signatureValid =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!signatureValid) {
      logger.error({ requestId: req.id }, "[WEBHOOK] Invalid signature — rejected");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    logger.info({ requestId: req.id, eventType }, "[WEBHOOK] Received");

    // Handle payment captured (successful payment)
    if (eventType === "payment.captured") {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      const razorpayPaymentId = payment.id;
      const amount = payment.amount / 100; // Convert paise to rupees

      // Find the order linked to this Razorpay order
      const existingPayment = await pool.query(
        "SELECT id, order_id FROM payments WHERE transaction_id = $1",
        [razorpayOrderId]
      );

      if (existingPayment.rows.length > 0) {
        const orderId = existingPayment.rows[0].order_id;

        // Update payment status
        await pool.query(
          "UPDATE payments SET payment_status = 'completed', transaction_id = $1, updated_at = NOW() WHERE order_id = $2 AND transaction_id = $3",
          [razorpayPaymentId, orderId, razorpayOrderId]
        );

        // Order stays pending — admin controls status manually
        // Payment captured is recorded but order status stays as-is

        logger.info({ requestId: req.id, orderId, amount }, "[WEBHOOK] Payment captured");
      }
    }

    // Handle payment failed
    if (eventType === "payment.failed") {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      const existingPayment = await pool.query(
        "SELECT id, order_id FROM payments WHERE transaction_id = $1",
        [razorpayOrderId]
      );

      if (existingPayment.rows.length > 0) {
        await pool.query(
          "UPDATE payments SET payment_status = 'failed', updated_at = NOW() WHERE id = $1",
          [existingPayment.rows[0].id]
        );

        logger.info({ requestId: req.id, orderId: existingPayment.rows[0].order_id }, "[WEBHOOK] Payment failed");
      }
    }

    // Handle refund processed
    if (eventType === "refund.processed") {
      const refund = event.payload.refund.entity;
      const paymentId = refund.payment_id;

      await pool.query(
        "UPDATE payments SET payment_status = 'refunded', updated_at = NOW() WHERE transaction_id = $1",
        [paymentId]
      );

      logger.info({ requestId: req.id, razorpayPaymentId: paymentId }, "[WEBHOOK] Refund processed");
    }

    // Always respond 200 so Razorpay knows we received it
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ requestId: req.id, err: { message: error.message, stack: error.stack } }, "[WEBHOOK] Processing error");
    // Still return 200 to prevent Razorpay from retrying
    res.status(200).json({ received: true });
  }
};
