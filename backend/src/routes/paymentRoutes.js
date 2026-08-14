import express from "express";
import auth from "../middleware/auth.js";
import { paymentLimiter } from "../middleware/rateLimiter.js";
import validate from "../middleware/validate.js";
import { createPaymentSchema, verifyPaymentSchema, refundPaymentSchema } from "../utils/validation.js";
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
  refundPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

// All payment routes are protected. The three that touch Razorpay on every
// call get a tighter limiter than the general API budget.
router.post("/create-order", auth, paymentLimiter, validate(createPaymentSchema), createPaymentOrder);
router.post("/verify", auth, paymentLimiter, validate(verifyPaymentSchema), verifyPayment);
router.get("/:orderId", auth, getPaymentStatus);
router.post("/refund", auth, paymentLimiter, validate(refundPaymentSchema), refundPayment);

export default router;
