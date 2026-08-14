import logger from "../utils/logger.js";

// Sends an OTP SMS via MSG91's Flow (template) API. Falls back to logging
// the OTP instead of sending a real SMS when MSG91 isn't configured, so the
// registration flow works end-to-end in local dev without a paid account —
// set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID to send real messages.
//
// Requires an OTP template created in the MSG91 dashboard first, with a
// variable (MSG91_OTP_VARIABLE_NAME, default "OTP") that gets substituted
// with the actual code — the variable name must match what the template
// was created with.
export const sendOtpSms = async (phone, otp) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) {
    logger.info({ phone, otp }, "[OTP] MSG91 not configured — logging OTP instead of sending a real SMS (dev mode)");
    return { devMode: true };
  }

  const variableName = process.env.MSG91_OTP_VARIABLE_NAME || "OTP";

  const response = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: templateId,
      short_url: "0",
      recipients: [
        {
          mobiles: `91${phone}`,
          [variableName]: otp,
        },
      ],
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.type === "error") {
    logger.error({ phone, status: response.status, result }, "[OTP] MSG91 send failed");
    throw new Error("Failed to send OTP SMS");
  }

  return { devMode: false, providerResponse: result };
};

// Sends an "order ready for pickup" SMS via the same MSG91 Flow API, using a
// separate template from the OTP one (MSG91_ORDER_READY_TEMPLATE_ID) since
// MSG91 templates are fixed-content and pre-approved per message type — you
// can't send arbitrary free text through the OTP template. Falls back to
// logging in dev mode, same as sendOtpSms.
//
// Requires an order-ready template created in the MSG91 dashboard first,
// with two variables (MSG91_CUSTOMER_NAME_VARIABLE_NAME default "NAME",
// MSG91_ORDER_ID_VARIABLE_NAME default "ORDERID") whose names must match
// what the template was created with.
export const sendOrderReadySms = async (phone, { customerName, orderId }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_ORDER_READY_TEMPLATE_ID;

  if (!authKey || !templateId) {
    logger.info({ phone, orderId, customerName }, "[Order Ready] MSG91 not configured — logging instead of sending a real SMS (dev mode)");
    return { devMode: true };
  }

  const nameVariable = process.env.MSG91_CUSTOMER_NAME_VARIABLE_NAME || "NAME";
  const orderIdVariable = process.env.MSG91_ORDER_ID_VARIABLE_NAME || "ORDERID";

  const response = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: templateId,
      short_url: "0",
      recipients: [
        {
          mobiles: `91${phone}`,
          [nameVariable]: customerName,
          [orderIdVariable]: String(orderId),
        },
      ],
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.type === "error") {
    logger.error({ phone, orderId, status: response.status, result }, "[Order Ready] MSG91 send failed");
    throw new Error("Failed to send order-ready SMS");
  }

  return { devMode: false, providerResponse: result };
};
