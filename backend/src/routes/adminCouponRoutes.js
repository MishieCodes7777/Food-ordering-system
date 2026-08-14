import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import { requireRole } from "../middleware/adminAuth.js";
import validate from "../middleware/validate.js";
import { createCouponSchema, updateCouponSchema } from "../utils/adminValidation.js";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "../controllers/adminCouponController.js";

const router = express.Router();

// Coupons affect revenue directly — same owner/manager-only gating as ledger/analytics.
router.get("/", adminAuth, requireRole("owner", "manager"), getCoupons);
router.post("/", adminAuth, requireRole("owner", "manager"), validate(createCouponSchema), createCoupon);
router.put("/:id", adminAuth, requireRole("owner", "manager"), validate(updateCouponSchema), updateCoupon);
router.delete("/:id", adminAuth, requireRole("owner", "manager"), deleteCoupon);

export default router;
