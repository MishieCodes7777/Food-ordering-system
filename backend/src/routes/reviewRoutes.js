import express from "express";
import auth from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { createReviewSchema } from "../utils/validation.js";
import { createOrUpdateReview, getReviewsForItem, getReviewableItems } from "../controllers/reviewController.js";

const router = express.Router();

router.post("/", auth, validate(createReviewSchema), createOrUpdateReview);
router.get("/reviewable", auth, getReviewableItems);
// Public — no auth, anyone browsing the menu can read reviews
router.get("/item/:itemId", getReviewsForItem);

export default router;
