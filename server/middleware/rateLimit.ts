import rateLimit from "express-rate-limit";
import { Request } from "express";

/**
 * Rate limiter for AI chat endpoints
 * 1 request per 3 seconds per user (identified by cookie UUID)
 */
export const aiChatRateLimiter = rateLimit({
  windowMs: 3 * 1000, // 3 seconds
  max: 2, // burst of 2
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Always use userId for rate limiting, no IP fallback needed
    return !(req as any).userId;
  },
  keyGenerator: (req: Request) => {
    // Use cookie-based user ID only (no IP fallback to avoid IPv6 issues)
    return (req as any).userId || "anonymous";
  },
  handler: (req, res) => {
    res.status(429).json({
      code: "RATE_LIMIT_EXCEEDED",
      message: "送信が早すぎます。3秒後に再試行してください",
    });
  },
});
