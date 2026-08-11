import express from "express";
import auth from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { validateCouponSchema } from "../utils/validation.js";
import { validateCoupon } from "../controllers/couponController.js";

const router = express.Router();

router.post("/validate", auth, validate(validateCouponSchema), validateCoupon);

export default router;
