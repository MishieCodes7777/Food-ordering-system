import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import { getReviewsAdmin, deleteReviewAdmin } from "../controllers/reviewController.js";

const router = express.Router();

router.get("/", adminAuth, getReviewsAdmin);
router.delete("/:id", adminAuth, deleteReviewAdmin);

export default router;
