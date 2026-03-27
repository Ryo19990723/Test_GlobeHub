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

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);

  return httpServer;
}
