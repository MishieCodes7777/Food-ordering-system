import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import pool from "../db/db.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to set HTTP-only cookie
const setTokenCookie = (res, token) => {
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3 * 24 * 60 * 60 * 1000,
    });
};

const setAdminTokenCookie = (res, token) => {
    res.cookie("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3 * 24 * 60 * 60 * 1000,
    });
};

// POST /api/auth/google — Customer Google login/signup
export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: "Google credential is required" });
        }

        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        if (!email) {
            return res.status(400).json({ message: "Unable to get email from Google" });
        }

        // Check if user already exists
        let user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            // Create new user (no password since it's Google auth)
            user = await pool.query(
                "INSERT INTO users (name, email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, 'customer', NOW(), NOW()) RETURNING *",
                [name, email, `google_${googleId}`]
            );
        }

        const userData = user.rows[0];

        // Check if first login
        const isFirstLogin = userData.created_at?.getTime() === userData.updated_at?.getTime();

        // Update updated_at
        await pool.query("UPDATE users SET updated_at = NOW() WHERE id = $1", [userData.id]);

        // Generate JWT
        const token = jwt.sign({ id: userData.id }, process.env.JWT_SECRET, { expiresIn: "3d" });
        setTokenCookie(res, token);

        const { password_hash, ...safeUser } = userData;
        res.json({ user: safeUser, token, is_first_login: isFirstLogin });
    } catch (error) {
        console.error("Google auth error:", error.message);
        res.status(401).json({ message: "Google authentication failed" });
    }
};

// POST /api/admin/auth/google — Admin Google login
export const googleAdminLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: "Google credential is required" });
        }

        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email } = payload;

        if (!email) {
            return res.status(400).json({ message: "Unable to get email from Google" });
        }

        // Check if admin user exists with this email
        const admin = await pool.query("SELECT * FROM admin_users WHERE email = $1", [email]);

        if (admin.rows.length === 0) {
            return res.status(403).json({ message: "No admin account found with this Google email. Contact your restaurant owner." });
        }

        const adminData = admin.rows[0];

        // Generate JWT
        const token = jwt.sign({ id: adminData.id, type: "admin" }, process.env.JWT_SECRET, { expiresIn: "3d" });
        setAdminTokenCookie(res, token);

        const { password_hash, ...safeAdmin } = adminData;
        res.json({ admin: safeAdmin, token });
    } catch (error) {
        console.error("Google admin auth error:", error.message);
        res.status(401).json({ message: "Google authentication failed" });
    }
};
