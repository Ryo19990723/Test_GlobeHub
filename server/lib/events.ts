import { prisma } from "../db";

/** Events the client may send. Server-only events (signup) are recorded with track() directly. */
export const CLIENT_EVENTS = ["visit", "share", "journal_view", "cta_click"] as const;

/** Fire-and-forget: analytics must never break or slow down the request. */
export function track(name: string, userId: string | undefined, props?: Record<string, string>) {
  prisma.event
    .create({ data: { name, userId: userId ?? null, ...(props ? { props } : {}) } })
    .catch((e) => console.error("track error:", (e as Error).message));
}
