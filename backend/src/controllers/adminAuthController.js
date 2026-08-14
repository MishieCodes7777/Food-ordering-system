import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db/db.js";
import { blacklistToken } from "../utils/tokenBlacklist.js";
import { authCookieOptions, clearAuthCookieOptions } from "../utils/cookieOptions.js";
import { createLockoutTracker } from "../utils/loginLockout.js";

const lockout = createLockoutTracker({ namespace: "admin" });

const setAdminTokenCookie = (res, token) => {
    res.cookie("admin_token", token, authCookieOptions());
};

// POST /api/admin/auth/register — Register a new admin user (owner only)
export const registerAdmin = async (req, res, next) => {
    try {
        const { name, password, restaurant_id, role } = req.body;
        const email = req.body.email.trim().toLowerCase();

        // Only owners can register new admin users
        if (req.admin.role !== "owner") {
            return res.status(403).json({ message: "Only owners can register new admin users" });
        }

        // Ensure the restaurant belongs to this owner
        if (req.admin.restaurant_id !== restaurant_id) {
            return res.status(403).json({ message: "You can only add staff to your own restaurant" });
        }

        // Check if email already exists
        const existing = await pool.query("SELECT id FROM admin_users WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: "Unable to create account. Please try with different credentials." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = await pool.query(
            "INSERT INTO admin_users (restaurant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, restaurant_id, name, email, role, created_at",
            [restaurant_id, name, email, hashedPassword, role]
        );

        res.status(201).json({ message: "Admin user created", admin: newAdmin.rows[0] });
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/auth/login — Admin login
export const loginAdmin = async (req, res, next) => {
    try {
        const { password } = req.body;
        const email = req.body.email.trim().toLowerCase();

        // Check account lockout
        if (await lockout.isLocked(email)) {
            return res.status(423).json({
                message: `Account temporarily locked. Try again in ${await lockout.remainingLockMinutes(email)} minutes.`,
            });
        }

        // Find admin user
        const admin = await pool.query("SELECT * FROM admin_users WHERE email = $1", [email]);
        if (admin.rows.length === 0) {
            await lockout.recordFailure(email);
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, admin.rows[0].password_hash);
        if (!isMatch) {
            await lockout.recordFailure(email);
            const remaining = await lockout.remainingAttempts(email);

            if (remaining <= 3 && remaining > 0) {
                return res.status(400).json({
                    message: `Invalid email or password. ${remaining} attempts remaining before lockout.`,
                });
            }

            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Success
        await lockout.clear(email);

        const token = jwt.sign(
            { id: admin.rows[0].id, type: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "3d" }
        );

        setAdminTokenCookie(res, token);

        const { password_hash, ...adminData } = admin.rows[0];
        res.json({ admin: adminData, token });
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/auth/logout — Admin logout
export const logoutAdmin = async (req, res) => {
    if (req.token) {
        await blacklistToken(req.token);
    }

    res.clearCookie("admin_token", clearAuthCookieOptions());

    res.json({ message: "Logged out successfully" });
};

// GET /api/admin/auth/me — Get current admin profile
export const getAdminProfile = async (req, res, next) => {
    try {
        res.json({ admin: req.admin });
    } catch (error) {
        next(error);
    }
};
