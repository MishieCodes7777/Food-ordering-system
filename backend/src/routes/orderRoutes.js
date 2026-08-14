import express from "express";
import auth from "../middleware/auth.js";
import { paymentLimiter } from "../middleware/rateLimiter.js";
import { placeOrder, getOrders, getRecentlyOrderedItems, getOrderById, getOrderStatus, cancelOrder } from "../controllers/orderController.js";

const router = express.Router();

// All order routes are protected
router.post("/place", auth, paymentLimiter, placeOrder);
router.get("/", auth, getOrders);
// Must come before /:orderId — otherwise Express matches "recent-items" as
// an :orderId value on that wildcard route instead of hitting this one.
router.get("/recent-items", auth, getRecentlyOrderedItems);
router.get("/:orderId", auth, getOrderById);
router.get("/:orderId/status", auth, getOrderStatus);
router.post("/:orderId/cancel", auth, cancelOrder);

export default router;
