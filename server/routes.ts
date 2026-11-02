import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import authRoutes from "./routes/auth";
import tripsRoutes from "./routes/trips";
import spotsRoutes from "./routes/spots";
import photosRoutes from "./routes/photos";
import searchRoutes from "./routes/search";
import locationRoutes from "./routes/location";
import aiRoutes from "./routes/ai";
import discoverRoutes from "./routes/discover";
import homeRoutes from "./routes/home";
import profileRoutes from "./routes/profile";
import usersRoutes from "./routes/users";
import { prisma } from "./db";
import { fileService } from "./lib/fileService";
import { sessionSecret } from "./lib/session";

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware
  app.use(express.json());
  app.use(cookieParser(sessionSecret())); // throws at startup in production without SESSION_SECRET

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/trips", tripsRoutes);
  app.use("/api", spotsRoutes); // Handles /api/spots and /api/trips/:tripId/spots
  app.use("/api", photosRoutes); // Handles /api/photos and /api/spots/:spotId/photos
  app.use("/api/search", searchRoutes);
  app.use("/api/location", locationRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/discover", discoverRoutes);
  app.use("/api/home", homeRoutes);
  app.use("/api/me", profileRoutes);
  app.use("/api/users", usersRoutes);

  // Health check
  // Also pings the DB: keeps the Supabase free project from pausing and surfaces connection problems.
  app.get("/api/health", async (_req, res) => {
    const timestamp = new Date().toISOString();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const storage = await fileService.check();
      const supabaseUrl = process.env.SUPABASE_URL ?? "";
      res.json({
        status: storage === "ok" || storage === "local" ? "ok" : "degraded",
        db: "ok",
        storage,
        ...(storage === "ok" ? {} : { supabaseUrlLooksRight: /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(supabaseUrl) }),
        timestamp,
      });
    } catch (err: any) {
      const url = process.env.SUPABASE_DB_URL ?? "";
      // Never echo credentials: strip anything between "://" and "@".
      const reason = String(err?.message ?? err)
        .replace(/:\/\/[^\s@]*@/g, "://***@")
        .split("\n")
        .filter(Boolean)
        .slice(-3)
        .join(" / ");
      // 200 on purpose: Render's health check is a liveness probe and would block deploys
      // (keeping the old version live) if a DB problem returned 503.
      res.json({
        status: "degraded",
        db: "error",
        errorCode: err?.errorCode ?? null,
        reason,
        dbUrlShape: {
          set: url.length > 0,
          postgresScheme: url.startsWith("postgresql://"),
          // Text before "://" never contains credentials; shows e.g. a pasted "KEY=" prefix.
          schemePrefix: url.includes("://") ? url.split("://")[0].slice(0, 24) : null,
          hasQuotesOrSpaces: /["'\s]/.test(url),
          hasPlaceholder: url.includes("["),
        },
        timestamp,
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
