import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import { requireRole } from "../middleware/adminAuth.js";
import validate from "../middleware/validate.js";
import { createRestaurantSchema, updateRestaurantSchema } from "../utils/adminValidation.js";
import { getRestaurant, updateRestaurant, createRestaurant, toggleRestaurant, getGstSettings, updateGstSettings } from "../controllers/restaurantController.js";

const router = express.Router();

// All routes require admin auth
router.get("/", adminAuth, getRestaurant);
router.post("/", adminAuth, requireRole("owner"), validate(createRestaurantSchema), createRestaurant);
router.put("/", adminAuth, requireRole("owner", "manager"), validate(updateRestaurantSchema), updateRestaurant);
router.put("/toggle", adminAuth, requireRole("owner"), toggleRestaurant);
router.get("/gst", adminAuth, getGstSettings);
router.put("/gst", adminAuth, requireRole("owner", "manager"), updateGstSettings);

export default router;
