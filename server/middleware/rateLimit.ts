import rateLimit from "express-rate-limit";
import { Request } from "express";

const keyGen = (req: Request) => (req as any).userId || "anonymous";
const skipAnon = (req: Request) => !(req as any).userId;

/** スポットチャット: 3秒に2回まで */
export const aiChatRateLimiter = rateLimit({
  windowMs: 3 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipAnon,
  keyGenerator: keyGen,
  handler: (_req, res) => {
    res.status(429).json({ code: "RATE_LIMIT_EXCEEDED", message: "送信が早すぎます。3秒後に再試行してください" });
  },
});

/** グローバルチャット: 1分に15回まで */
export const aiTravelChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipAnon,
  keyGenerator: keyGen,
  handler: (_req, res) => {
    res.status(429).json({ code: "RATE_LIMIT_EXCEEDED", message: "しばらく待ってから再試行してください" });
  },
});

/** AI整形: 1分に20回まで */
export const aiFormatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipAnon,
  keyGenerator: keyGen,
  handler: (_req, res) => {
    res.status(429).json({ code: "RATE_LIMIT_EXCEEDED", message: "しばらく待ってから再試行してください" });
  },
});

/** スポット推薦 / 旅行計画: 1分に5回まで */
export const aiPlanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipAnon,
  keyGenerator: keyGen,
  handler: (_req, res) => {
    res.status(429).json({ code: "RATE_LIMIT_EXCEEDED", message: "しばらく待ってから再試行してください" });
  },
});
