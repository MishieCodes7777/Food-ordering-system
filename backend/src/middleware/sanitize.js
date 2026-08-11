import xss from "xss";

// Credential fields must reach bcrypt/comparison byte-for-byte — HTML-entity
// escaping them here would silently narrow the password charset and couple
// stored hashes to this library's exact escaping behavior.
const UNSANITIZED_FIELDS = new Set(["password", "current_password", "new_password"]);

// Recursively sanitize all string values in an object
const sanitizeValue = (value) => {
  if (typeof value === "string") {
    return xss(value.trim());
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === "object") {
    return sanitizeObject(value);
  }
  return value;
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const key of Object.keys(obj)) {
    sanitized[key] = UNSANITIZED_FIELDS.has(key) ? obj[key] : sanitizeValue(obj[key]);
  }
  return sanitized;
};

// Middleware: sanitize req.body, req.query, req.params
const sanitize = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  // In Express 5, req.query and req.params are read-only getters
  // Only sanitize req.body (which is the main attack vector)
  next();
};

export default sanitize;
