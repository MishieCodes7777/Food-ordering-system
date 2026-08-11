import { describe, it, expect } from "vitest";
import crypto from "crypto";
import request from "supertest";
import app from "../src/app.js";
import pool from "../src/db/db.js";
import { uniqueEmail, uniquePhone, registerCustomer } from "./helpers.js";

// verifyPayment's HMAC check is the thing standing between "a customer paid"
// and "we mark the order paid" — these tests seed a payment row directly via
// SQL (bypassing POST /api/payments/create-order, which requires live
// Razorpay API connectivity) so the signature-verification logic itself can
// be tested without depending on a third-party service being reachable.

const placeOrderAndSeedPendingPayment = async (agent, razorpayOrderId) => {
  await agent.post("/api/cart/add").send({ menu_item_id: 1, quantity: 1 }).expect(201);
  const placeRes = await agent.post("/api/orders/place").send({}).expect(201);
  const orderId = placeRes.body.order.id;
  const amount = placeRes.body.total_amount;

  await pool.query(
    "INSERT INTO payments (order_id, amount, payment_method, payment_status, transaction_id, created_at, updated_at) VALUES ($1, $2, 'RAZORPAY', 'pending', $3, NOW(), NOW())",
    [orderId, amount, razorpayOrderId]
  );

  return orderId;
};

describe("Razorpay payment signature verification", () => {
  it("accepts a correctly-signed payment and marks it completed", async () => {
    const email = uniqueEmail("paytest_valid");
    const agent = request.agent(app);
    await registerCustomer(agent, { name: "Pay Test", email, phone: uniquePhone() });

    const razorpayOrderId = `order_test_${Date.now()}`;
    const razorpayPaymentId = `pay_test_${Date.now()}`;
    const orderId = await placeOrderAndSeedPendingPayment(agent, razorpayOrderId);

    const validSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const res = await agent.post("/api/payments/verify").send({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: validSignature,
      order_id: orderId,
    });

    expect(res.status).toBe(200);

    const payment = await pool.query("SELECT payment_status FROM payments WHERE order_id = $1", [orderId]);
    expect(payment.rows[0].payment_status).toBe("completed");
  });

  it("rejects a tampered signature and leaves the payment pending", async () => {
    const email = uniqueEmail("paytest_tampered");
    const agent = request.agent(app);
    await registerCustomer(agent, { name: "Pay Test 2", email, phone: uniquePhone() });

    const razorpayOrderId = `order_test_${Date.now()}`;
    const razorpayPaymentId = `pay_test_${Date.now()}`;
    const orderId = await placeOrderAndSeedPendingPayment(agent, razorpayOrderId);

    const res = await agent.post("/api/payments/verify").send({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: "0".repeat(64), // well-formed hex, but not a valid HMAC for this payload
      order_id: orderId,
    });

    expect(res.status).toBe(400);

    const payment = await pool.query("SELECT payment_status FROM payments WHERE order_id = $1", [orderId]);
    expect(payment.rows[0].payment_status).toBe("pending");
  });
});
