import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import pool from "../src/db/db.js";
import { uniqueEmail, uniquePhone, registerCustomer } from "./helpers.js";

// These specifically exercise the status-gating rules that the earlier
// security fixes depend on — a regression here (e.g. someone loosening a
// status check) would silently reopen the refund/cancel abuse this app was
// patched against.
const registerAndPlaceOrder = async () => {
  const email = uniqueEmail("gatingtest");
  const agent = request.agent(app);
  await registerCustomer(agent, { name: "Gating Test", email, phone: uniquePhone() });
  await agent.post("/api/cart/add").send({ menu_item_id: 1, quantity: 1 }).expect(201);
  const placeRes = await agent.post("/api/orders/place").send({}).expect(201);
  return { agent, orderId: placeRes.body.order.id };
};

describe("Order cancel gating", () => {
  it("allows cancelling a pending order", async () => {
    const { agent, orderId } = await registerAndPlaceOrder();
    const res = await agent.post(`/api/orders/${orderId}/cancel`);
    expect(res.status).toBe(200);

    const order = await pool.query("SELECT status FROM orders WHERE id = $1", [orderId]);
    expect(order.rows[0].status).toBe("cancelled");
  });

  it("rejects cancelling an order that is no longer pending", async () => {
    const { agent, orderId } = await registerAndPlaceOrder();
    await agent.post(`/api/orders/${orderId}/cancel`).expect(200); // now cancelled

    const res = await agent.post(`/api/orders/${orderId}/cancel`);
    expect(res.status).toBe(400);
  });
});

describe("Self-service refund gating", () => {
  it("rejects refunding an order that is no longer pending", async () => {
    const { agent, orderId } = await registerAndPlaceOrder();
    await agent.post(`/api/orders/${orderId}/cancel`).expect(200); // now cancelled, not pending

    const res = await agent.post("/api/payments/refund").send({ order_id: orderId });
    expect(res.status).toBe(400);
  });

  it("rejects refunding an order with no completed payment", async () => {
    const { agent, orderId } = await registerAndPlaceOrder();

    // Still pending, but no payment was ever made
    const res = await agent.post("/api/payments/refund").send({ order_id: orderId });
    expect(res.status).toBe(400);
  });
});
