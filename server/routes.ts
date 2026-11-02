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

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware
  app.use(express.json());
  app.use(cookieParser());

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
      res.json({ status: "ok", db: "ok", timestamp });
    } catch (err: any) {
      const url = process.env.SUPABASE_DB_URL ?? "";
      // Never echo credentials: strip anything between "://" and "@".
      const reason = String(err?.message ?? err)
        .replace(/:\/\/[^\s@]*@/g, "://***@")
        .split("\n")
        .filter(Boolean)
        .slice(-3)
        .join(" / ");
      res.status(503).json({
        status: "degraded",
        db: "error",
        errorCode: err?.errorCode ?? null,
        reason,
        dbUrlShape: {
          set: url.length > 0,
          postgresScheme: url.startsWith("postgresql://"),
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
