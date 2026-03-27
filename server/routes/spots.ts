import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authMiddleware, requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, ValidatedRequest } from "../middleware/validate";

const router = Router();

// Schemas
const SpotCreateSchema = z.object({
  name: z.string().max(80).optional(),
  placeName: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  address: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  locationSource: z.enum(["photo", "current", "search"]).optional(),
});

const SpotUpdateSchema = z.object({
  name: z.string().max(80).optional(),
  placeName: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  address: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
  impressionRemarks: z.string().optional(),
  nextTravelerTips: z.string().optional(),
  atmosphere: z.string().max(50).optional().nullable(),
  cost: z.string().max(50).optional().nullable(),
  duration: z.string().max(50).optional().nullable(),
  rating: z.number().min(1).max(5).optional(),
  locationSource: z.enum(["photo", "current", "search"]).optional(),
  meta: z.string().optional(),
});

// POST /api/trips/:tripId/spots - Create spot
router.post(
  "/trips/:tripId/spots",
  authMiddleware,
  requireAuth,
  validateBody(SpotCreateSchema),
  async (req: ValidatedRequest & AuthRequest, res) => {
    try {
      const { tripId } = req.params;
      const spotData = req.validated!.body;

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
      });

      if (!trip) {
        res.status(404).json({
          code: "NOT_FOUND",
          message: "旅記録が見つかりません",
        });
        return;
      }

      if (trip.authorId !== req.userId) {
        res.status(403).json({
          code: "FORBIDDEN",
          message: "この旅記録にスポットを追加する権限がありません",
        });
        return;
      }

      const spot = await prisma.spot.create({
        data: {
          ...spotData,
          tripId,
        },
      });

      res.status(201).json(spot);
    } catch (error) {
      console.error("Create spot error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "スポットの作成に失敗しました",
      });
    }
  }
);

// GET /api/spots/:id - Get spot detail
router.get("/spots/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const spot = await prisma.spot.findUnique({
      where: { id },
      include: {
        photos: true,
        trip: {
          select: {
            id: true,
            authorId: true,
            status: true,
          },
        },
      },
    });

    if (!spot) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "スポットが見つかりません",
      });
      return;
    }

    // Allow access if trip is published or user is the author
    if (spot.trip.status !== "PUBLISHED" && spot.trip.authorId !== req.userId) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "このスポットを閲覧する権限がありません",
      });
      return;
    }

    res.json(spot);
  } catch (error) {
    console.error("Get spot error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "スポットの取得に失敗しました",
    });
  }
});

// PATCH /api/spots/:id - Update spot
router.patch(
  "/spots/:id",
  authMiddleware,
  requireAuth,
  validateBody(SpotUpdateSchema),
  async (req: ValidatedRequest & AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.validated!.body;

      const spot = await prisma.spot.findUnique({
        where: { id },
        include: {
          trip: true,
        },
      });

      if (!spot) {
        res.status(404).json({
          code: "NOT_FOUND",
          message: "スポットが見つかりません",
        });
        return;
      }

      if (spot.trip.authorId !== req.userId) {
        res.status(403).json({
          code: "FORBIDDEN",
          message: "このスポットを編集する権限がありません",
        });
        return;
      }

      const updated = await prisma.spot.update({
        where: { id },
        data: updates,
      });

      res.json(updated);
    } catch (error) {
      console.error("Update spot error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "スポットの更新に失敗しました",
      });
    }
  }
);

// DELETE /api/spots/:id - Delete spot
router.delete("/spots/:id", authMiddleware, requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const spot = await prisma.spot.findUnique({
      where: { id },
      include: {
        trip: true,
      },
    });

    if (!spot) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "スポットが見つかりません",
      });
      return;
    }

    if (spot.trip.authorId !== req.userId) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "このスポットを削除する権限がありません",
      });
      return;
    }

    // Delete related photos first
    await prisma.photo.deleteMany({
      where: { spotId: id },
    });

    await prisma.spot.delete({
      where: { id },
    });

    res.json({ message: "スポットを削除しました" });
  } catch (error) {
    console.error("Delete spot error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "スポットの削除に失敗しました",
    });
  }
});

export default router;