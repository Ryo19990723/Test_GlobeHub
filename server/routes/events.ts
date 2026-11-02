import { Router } from "express";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { eventLimiter } from "../middleware/rateLimit";
import { CLIENT_EVENTS, track } from "../lib/events";

const router = Router();

const EventSchema = z.object({
  name: z.enum(CLIENT_EVENTS),
  props: z
    .record(z.string().max(300))
    .refine((p) => Object.keys(p).length <= 12, "too many props")
    .optional(),
});

// POST /api/events - record a usage event (visit with UTM, share, public journal view, CTA click)
router.post("/", authMiddleware, eventLimiter, (req: AuthRequest, res) => {
  const parsed = EventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "INVALID_EVENT" });
    return;
  }
  track(parsed.data.name, req.userId, parsed.data.props);
  res.status(204).end();
});

export default router;
