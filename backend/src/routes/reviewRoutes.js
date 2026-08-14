import express from "express";
import auth from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { createReviewSchema } from "../utils/validation.js";
import { createReview, getReviewForOrder, getPublicReviews } from "../controllers/reviewController.js";

const router = express.Router();

router.post("/", auth, validate(createReviewSchema), createReview);
router.get("/public", getPublicReviews);
router.get("/order/:orderId", auth, getReviewForOrder);

export default router;
