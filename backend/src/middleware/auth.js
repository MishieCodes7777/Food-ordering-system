import jwt from "jsonwebtoken";
import { isTokenBlacklisted } from "../utils/tokenBlacklist.js";

const auth = async (req, res, next) => {
  // Check for token in Authorization header first, then cookie
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Access denied, no token provided" });
  }

  // Check if token has been blacklisted (logged out)
  if (await isTokenBlacklisted(token)) {
    return res.status(401).json({ message: "Token has been invalidated. Please login again." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "customer") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = decoded;
    req.token = token; // Store token reference for logout
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default auth;
