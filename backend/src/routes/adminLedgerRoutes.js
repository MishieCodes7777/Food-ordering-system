import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import { requireRole } from "../middleware/adminAuth.js";
import { getLedger, getLedgerSummary } from "../controllers/ledgerController.js";

const router = express.Router();

// Financial data — same owner/manager-only gating as analytics, staff don't see this.
router.get("/", adminAuth, requireRole("owner", "manager"), getLedger);
router.get("/summary", adminAuth, requireRole("owner", "manager"), getLedgerSummary);

export default router;
