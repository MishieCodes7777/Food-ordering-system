import jwt from "jsonwebtoken";
import pool from "../db/db.js";
import { isTokenBlacklisted } from "../utils/tokenBlacklist.js";

// Verify admin JWT token and attach admin user to request
const adminAuth = async (req, res, next) => {
    let token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.admin_token) {
        token = req.cookies.admin_token;
    }

    if (!token) {
        return res.status(401).json({ message: "Access denied, no token provided" });
    }

    if (await isTokenBlacklisted(token)) {
        return res.status(401).json({ message: "Token has been invalidated. Please login again." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== "admin") {
            return res.status(401).json({ message: "Invalid admin token" });
        }

        // Verify this is an admin user
        const admin = await pool.query(
            "SELECT id, restaurant_id, name, email, role FROM admin_users WHERE id = $1",
            [decoded.id]
        );

        if (admin.rows.length === 0) {
            return res.status(401).json({ message: "Invalid admin token" });
        }

        req.admin = admin.rows[0];
        req.token = token;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

// Role-based access control middleware
// Usage: requireRole("owner", "manager")
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ message: "Authentication required" });
        }

        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({ message: "Insufficient permissions" });
        }

        next();
    };
};

export default adminAuth;
