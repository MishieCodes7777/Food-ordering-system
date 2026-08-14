import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import hpp from "hpp";
import dotenv from "dotenv";

dotenv.config();

import pool from "./db/db.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import sanitize from "./middleware/sanitize.js";
import errorHandler from "./middleware/errorHandler.js";
import requestId from "./middleware/requestId.js";
import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import adminRestaurantRoutes from "./routes/adminRestaurantRoutes.js";
import adminCategoryRoutes from "./routes/adminCategoryRoutes.js";
import adminMenuItemRoutes from "./routes/adminMenuItemRoutes.js";
import adminTableRoutes from "./routes/adminTableRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoutes.js";
import adminLedgerRoutes from "./routes/adminLedgerRoutes.js";
import publicMenuRoutes from "./routes/publicMenuRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import adminReviewRoutes from "./routes/adminReviewRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import adminCouponRoutes from "./routes/adminCouponRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";

// Fail fast and loud on a missing required secret, instead of booting
// "successfully" and only breaking confusingly on a customer's first
// login/checkout once that code path is actually hit.
const REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "DB_USER",
  "DB_PASSWORD",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`[STARTUP] Missing required environment variables: ${missingEnvVars.join(", ")}`);
  console.error("[STARTUP] Refusing to start. Set these in .env before running the server.");
  process.exit(1);
}

const app = express();

// Trust the first hop reverse proxy (Elastic Beanstalk/Render/Heroku/etc.) in
// production so req.ip and rate-limit/lockout keying reflect the real client,
// not the proxy. Left off in development since nothing sits in front of the
// dev server, and trusting X-Forwarded-For there would let anyone spoof req.ip.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Production is locked to the exact configured frontend origin. Dev accepts
// any localhost/127.0.0.1 port instead of a hardcoded list — Vite auto-increments
// past a taken port, and a hardcoded whitelist silently breaks CORS the moment
// it does.
const productionOrigins = [process.env.FRONTEND_URL].filter(Boolean);
const isDevLocalhost = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

// Tag every request with an ID before anything else runs, so it's available
// to the webhook route, morgan, and every downstream error.
app.use(requestId);
morgan.token("id", (req) => req.id);

// Webhook route (must be before express.json — needs raw body for signature verification)
app.use("/api/webhooks", webhookRoutes);

// Middleware
app.use(helmet()); // Secure HTTP headers
app.use(morgan(':id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"')); // Request logging (IP, route, status, time, request id)
app.use(cookieParser()); // Parse cookies
app.use(cors({
  origin: (origin, callback) => {
    // No Origin header = same-origin, curl, or a server-to-server call (webhooks
    // are mounted before this middleware and never reach it) — allow.
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== "production" && isDevLocalhost(origin)) {
      return callback(null, true);
    }
    if (productionOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10kb" })); // Body size limit
app.use(express.urlencoded({ extended: false, limit: "10kb" })); // URL-encoded body limit
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(sanitize); // Strip HTML/scripts from all inputs
app.use("/api", apiLimiter); // General rate limit on all API routes

// Routes — Customer side
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/menu", publicMenuRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/stats", statsRoutes);

// Routes — Admin side
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/restaurant", adminRestaurantRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/menu-items", adminMenuItemRoutes);
app.use("/api/admin/tables", adminTableRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/admin/ledger", adminLedgerRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);
app.use("/api/admin/upload", uploadRoutes);

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Food Ordering API is running" });
});

// Test DB route
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 404 handler — for routes that don't exist
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler — must be LAST middleware
app.use(errorHandler);

export default app;
