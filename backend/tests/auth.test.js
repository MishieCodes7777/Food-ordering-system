import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { uniqueEmail, uniquePhone, registerCustomer } from "./helpers.js";

describe("JWT type-claim isolation (customer vs admin)", () => {
  it("rejects a customer token on an admin-only route", async () => {
    const email = uniqueEmail("authtest_customer");
    const agent = request.agent(app);

    await registerCustomer(agent, { name: "Auth Test Customer", email, phone: uniquePhone() });

    // Sanity: the customer token works on its own routes
    await agent.get("/api/cart").expect(200);

    // The same token must be rejected on an admin-only route
    const res = await agent.get("/api/admin/orders");
    expect(res.status).toBe(401);
  });

  it("rejects an admin token on a customer-only route", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/admin/auth/login")
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
      .expect(200);

    // Sanity: the admin token works on its own routes
    await agent.get("/api/admin/orders").expect(200);

    // The same token must be rejected on a customer-only route
    const res = await agent.get("/api/cart");
    expect(res.status).toBe(401);
  });

  it("rejects requests with no token at all on protected routes", async () => {
    const res = await request(app).get("/api/cart");
    expect(res.status).toBe(401);
  });
});
