// Shared test helpers. These tests hit the real local dev database
// configured in .env (no separate test DB is set up yet) and create
// throwaway rows with random emails/phones — safe to run repeatedly,
// nothing is cleaned up afterward.

export const uniqueEmail = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}@example.com`;

// Phone must be a unique 10-digit number (enforced at the app layer in
// sendRegistrationOtp). Vitest runs test files in parallel, so Date.now()
// alone isn't enough entropy — two registrations in the same millisecond
// would collide. Random 9-digit suffix instead, starting with 9 to look
// like a plausible Indian mobile number.
export const uniquePhone = () => `9${String(Math.floor(100000000 + Math.random() * 900000000))}`;

// Registration is OTP-gated: send-otp returns a dev_otp field when no real
// SMS provider (MSG91) is configured, which is always true in this test
// environment — verify-otp then actually creates the account.
export const registerCustomer = async (agent, { name, email, phone, password = "TestPass123" }) => {
  const sendRes = await agent
    .post("/api/auth/register/send-otp")
    .send({ name, email, password, phone })
    .expect(200);

  const otp = sendRes.body.dev_otp;
  if (!otp) {
    throw new Error("dev_otp missing from send-otp response — is MSG91_AUTH_KEY set in this test environment?");
  }

  return agent
    .post("/api/auth/register/verify-otp")
    .send({ phone, otp })
    .expect(201);
};
