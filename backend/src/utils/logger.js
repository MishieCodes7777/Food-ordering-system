import pino from "pino";

// Structured JSON logging so a real log aggregator (or just `grep`) can
// filter by requestId/userId/orderId instead of parsing free-text messages.
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

export default logger;
