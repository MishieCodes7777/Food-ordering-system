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
import publicMenuRoutes from "./routes/publicMenuRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed origins (add your production domain later)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

// Webhook route (must be before express.json — needs raw body for signature verification)
app.use("/api/webhooks", webhookRoutes);

// Middleware
app.use(helmet()); // Secure HTTP headers
app.use(morgan("combined")); // Request logging (IP, route, status, time)
app.use(cookieParser()); // Parse cookies
app.use(cors({
  origin: allowedOrigins,
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

// Routes — Admin side
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/restaurant", adminRestaurantRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/menu-items", adminMenuItemRoutes);
app.use("/api/admin/tables", adminTableRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
