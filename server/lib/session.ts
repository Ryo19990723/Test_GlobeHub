import type { CookieOptions } from "express";

// The cookie holds the user id, so it MUST be signed: user ids are public
// (profile URLs, trip authors) and an unsigned cookie allows impersonation.
// Renamed from the old unsigned "GH-ANON-ID" so those cookies are simply ignored.
export const SESSION_COOKIE = "GH-SID";
export const LEGACY_COOKIE = "GH-ANON-ID";

const DEV_SECRET = "dev-only-insecure-session-secret-not-for-production";

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length >= 32 && !secret.startsWith("your-")) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET (32+ random chars) must be set in production");
  }
  return DEV_SECRET;
}

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  signed: true,
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
};
