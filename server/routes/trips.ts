import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { prisma } from "../db";
import { authMiddleware, requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, validateQuery, ValidatedRequest } from "../middleware/validate";

const router = Router();

// Schemas
const TripCreateSchema = z.object({
  title: z.string().min(1).max(80),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  startDate: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : val,
    z.coerce.date().optional()
  ),
  endDate: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : val,
    z.coerce.date().optional()
  ),
  peopleCount: z.string().max(20).optional().nullable(),
  companyType: z.enum(["solo", "friend", "couple", "family", "group"]).optional().nullable(),
});

const TripUpdateSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  summary: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  peopleCount: z.string().max(20).optional().nullable(),
  companyType: z.enum(["solo", "friend", "couple", "family", "group"]).optional().nullable(),
  heroUrl: z.string().max(500).optional().nullable(),
  startDate: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : val,
    z.coerce.date().optional()
  ).refine((val) => val === undefined || !isNaN(val.getTime()), {
    message: "Invalid date format",
  }),
  endDate: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : val,
    z.coerce.date().optional()
  ).refine((val) => val === undefined || !isNaN(val.getTime()), {
    message: "Invalid date format",
  }),
  safetyTips: z.string().max(2000).optional().nullable(),
  transportTips: z.string().max(2000).optional().nullable(),
  travelTips: z.string().max(2000).optional().nullable(),
  memorableMoment: z.string().max(2000).optional().nullable(),
  status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
});

const TripQuerySchema = z.object({
  status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
  sort: z.enum(["new", "popular"]).optional(),
  query: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Storage for hero photos
const heroPhotoStorage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    cb(null, `hero_${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Multer configuration for hero photo uploads
const heroPhotoUpload = multer({
  storage: heroPhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only images are allowed"));
      return;
    }
    cb(null, true);
  },
});

// GET /api/trips - List trips
router.get(
  "/",
  authMiddleware,
  validateQuery(TripQuerySchema),
  async (req: ValidatedRequest & AuthRequest, res) => {
    try {
      const query = req.validated!.query;
      const { page, pageSize, sort, status, query: searchQuery, city } = query;

      const skip = (page - 1) * pageSize;

      const where: any = {};

      if (status === "PUBLISHED") {
        where.status = "PUBLISHED";
      } else if (status === "DRAFT") {
        where.status = "DRAFT";
        if (req.userId) {
          where.authorId = req.userId;
        }
      } else if (!status && !req.userId) {
        // Default to published for anonymous users
        where.status = "PUBLISHED";
      }

      if (searchQuery) {
        where.OR = [
          { title: { contains: searchQuery } },
          { summary: { contains: searchQuery } },
        ];
      }

      if (city) {
        where.city = { contains: city };
      }

      const orderBy: any = sort === "popular"
        ? [{ likes: { _count: "desc" } }]
        : [{ createdAt: "desc" }];

      const [trips, total] = await Promise.all([
        prisma.trip.findMany({
          where,
          include: {
            author: true,
            spots: {
              include: {
                photos: {
                  take: 1,
                },
              },
              take: 1,
            },
            _count: {
              select: {
                likes: true,
                saves: true,
                spots: true,
              },
            },
            likes: req.userId
              ? {
                  where: { userId: req.userId },
                  select: { userId: true },
                }
              : false,
            saves: req.userId
              ? {
                  where: { userId: req.userId },
                  select: { userId: true },
                }
              : false,
          },
          orderBy,
          skip,
          take: pageSize,
        }),
        prisma.trip.count({ where }),
      ]);

      const items = trips.map((trip) => ({
        ...trip,
        isLiked: req.userId ? (trip.likes as any[]).length > 0 : false,
        isSaved: req.userId ? (trip.saves as any[]).length > 0 : false,
        likes: undefined,
        saves: undefined,
      }));

      res.json({
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      console.error("List trips error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "旅記録の取得に失敗しました",
      });
    }
  }
);

// POST /api/trips - Create trip
router.post(
  "/",
  authMiddleware,
  requireAuth,
  validateBody(TripCreateSchema),
  async (req: ValidatedRequest & AuthRequest, res) => {
    try {
      const { title, city, country, startDate, endDate, peopleCount, companyType } = req.validated!.body;

      const trip = await prisma.trip.create({
        data: {
          title,
          city: city || null,
          country: country || null,
          startDate: startDate || null,
          endDate: endDate || null,
          peopleCount: peopleCount || null,
          companyType: companyType || null,
          authorId: req.userId!,
        },
      });

      res.status(201).json(trip);
    } catch (error) {
      console.error("Create trip error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "旅記録の作成に失敗しました",
      });
    }
  }
);

// GET /api/trips/:id - Get trip detail
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        author: true,
        spots: {
          include: {
            photos: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            likes: true,
            saves: true,
            spots: true,
          },
        },
        likes: req.userId
          ? {
              where: { userId: req.userId },
              select: { userId: true },
            }
          : false,
        saves: req.userId
          ? {
              where: { userId: req.userId },
              select: { userId: true },
            }
          : false,
      },
    });

    if (!trip) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "旅記録が見つかりません",
      });
      return;
    }

    // Check access: published trips are public, drafts only for author
    if (trip.status === "DRAFT" && trip.authorId !== req.userId) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "この旅記録にアクセスする権限がありません",
      });
      return;
    }

    const result = {
      ...trip,
      isLiked: req.userId ? (trip.likes as any[]).length > 0 : false,
      isSaved: req.userId ? (trip.saves as any[]).length > 0 : false,
      likes: undefined,
      saves: undefined,
    };

    res.json(result);
  } catch (error) {
    console.error("Get trip error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "旅記録の取得に失敗しました",
    });
  }
});

// PATCH /api/trips/:id - Update trip
router.patch(
  "/:id",
  authMiddleware,
  requireAuth,
  validateBody(TripUpdateSchema),
  async (req: ValidatedRequest & AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.validated!.body;

      const trip = await prisma.trip.findUnique({
        where: { id },
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
          message: "この旅記録を編集する権限がありません",
        });
        return;
      }

      // If summary is being updated, extract city and country
      if (updates.summary) {
        try {
          const summaryData = JSON.parse(updates.summary);
          if (summaryData.city && !updates.city) {
            updates.city = summaryData.city;
          }
          if (summaryData.country && !updates.country) {
            updates.country = summaryData.country;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      const updated = await prisma.trip.update({
        where: { id },
        data: updates,
      });

      res.json(updated);
    } catch (error) {
      console.error("Update trip error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "旅記録の更新に失敗しました",
      });
    }
  }
);

// POST /api/trips/:id/publish - Publish trip
router.post(
  "/:id/publish",
  authMiddleware,
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const trip = await prisma.trip.findUnique({
        where: { id },
        include: {
          _count: {
            select: { spots: true },
          },
        },
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
          message: "この旅記録を公開する権限がありません",
        });
        return;
      }

      if (trip._count.spots === 0) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "最低1つのスポットが必要です",
        });
        return;
      }

      const updated = await prisma.trip.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("Publish trip error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "旅記録の公開に失敗しました",
      });
    }
  }
);

// POST /api/trips/:id/like - Like trip
router.post("/:id/like", authMiddleware, requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "旅記録が見つかりません",
      });
      return;
    }

    await prisma.like.create({
      data: {
        userId: req.userId!,
        tripId: id,
      },
    });

    res.json({ message: "いいねしました" });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({
        code: "ALREADY_LIKED",
        message: "既にいいねしています",
      });
      return;
    }
    console.error("Like trip error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "いいねに失敗しました",
    });
  }
});

// DELETE /api/trips/:id/like - Unlike trip
router.delete("/:id/like", authMiddleware, requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.like.delete({
      where: {
        userId_tripId: {
          userId: req.userId!,
          tripId: id,
        },
      },
    });

    res.json({ message: "いいねを取り消しました" });
  } catch (error) {
    console.error("Unlike trip error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "いいねの取り消しに失敗しました",
    });
  }
});

// POST /api/trips/:id/save - Save trip
router.post("/:id/save", authMiddleware, requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "旅記録が見つかりません",
      });
      return;
    }

    await prisma.save.create({
      data: {
        userId: req.userId!,
        tripId: id,
      },
    });

    res.json({ message: "保存しました" });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({
        code: "ALREADY_SAVED",
        message: "既に保存しています",
      });
      return;
    }
    console.error("Save trip error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "保存に失敗しました",
    });
  }
});

// DELETE /api/trips/:id/save - Unsave trip
router.delete("/:id/save", authMiddleware, requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.save.delete({
      where: {
        userId_tripId: {
          userId: req.userId!,
          tripId: id,
        },
      },
    });

    res.json({ message: "保存を解除しました" });
  } catch (error) {
    console.error("Unsave trip error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "保存解除に失敗しました",
    });
  }
});

// POST /trips/:id/hero-photo - Upload hero photo for summary
router.post(
  "/:id/hero-photo",
  authMiddleware,
  requireAuth,
  heroPhotoUpload.single("photo"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      if (!req.file) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "写真が必要です",
        });
        return;
      }

      const trip = await prisma.trip.findUnique({
        where: { id },
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
          message: "この旅記録を編集する権限がありません",
        });
        return;
      }

      const photoUrl = `/uploads/${req.file.filename}`;

      // Update summary with hero photo
      let summary = {};
      if (trip.summary) {
        try {
          summary = JSON.parse(trip.summary);
        } catch (e) {
          console.error("Failed to parse existing summary:", e);
        }
      }

      const updatedSummary = {
        ...summary,
        heroPhotoUrl: photoUrl,
      };

      await prisma.trip.update({
        where: { id },
        data: {
          summary: JSON.stringify(updatedSummary),
          city: (updatedSummary as any).city || trip.city,
          country: (updatedSummary as any).country || trip.country,
        },
      });

      res.json({ url: photoUrl });
    } catch (error) {
      console.error("Hero photo upload error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "写真のアップロードに失敗しました",
      });
    }
  }
);

// Create a new spot for a trip
  router.post("/:tripId/spots", authMiddleware, requireAuth, async (req: AuthRequest, res) => {
    const { tripId } = req.params;
    const userId = req.userId;

    try {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
      });

      if (!trip || trip.authorId !== userId) {
        res.status(404).json({ error: "Trip not found" });
        return;
      }

      const spot = await prisma.spot.create({
        data: {
          tripId,
        },
      });

      res.status(201).json(spot);
    } catch (error) {
      console.error("Failed to create spot:", error);
      res.status(500).json({ error: "Failed to create spot" });
    }
  });

  // Create a draft spot (alias for backward compatibility)
  router.post("/:tripId/spots/draft", authMiddleware, requireAuth, async (req: AuthRequest, res) => {
    const { tripId } = req.params;
    const userId = req.userId;

    try {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
      });

      if (!trip || trip.authorId !== userId) {
        res.status(404).json({ error: "Trip not found" });
        return;
      }

      const spot = await prisma.spot.create({
        data: {
          tripId,
        },
      });

      res.status(201).json({ id: spot.id, spotId: spot.id });
    } catch (error) {
      console.error("Failed to create draft spot:", error);
      res.status(500).json({ error: "Failed to create draft spot" });
    }
  });


// DELETE /trips/:id
router.delete(
  "/:id",
  authMiddleware,
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      // TODO: Add logic to delete related data (spots, photos, likes, saves)

      await prisma.trip.delete({
        where: { id },
      });

      res.status(204).send(); // No content to send back
    } catch (error) {
      console.error("Delete trip error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "旅記録の削除に失敗しました",
      });
    }
  }
);

export default router;