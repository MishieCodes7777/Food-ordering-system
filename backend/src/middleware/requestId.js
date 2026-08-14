import crypto from "crypto";

// Tags every request with a unique ID so a single failure can be traced
// across the morgan access-log line, the errorHandler log line, and the
// error response the client actually saw (returned in the JSON body).
const requestId = (req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
};

export default requestId;
