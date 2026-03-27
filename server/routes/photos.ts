import { Router } from "express";
import multer from "multer";
import { prisma } from "../db";
import { authMiddleware, requireAuth, AuthRequest } from "../middleware/auth";
import { fileService } from "../lib/fileService";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 20,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }
  },
});

// POST /api/photos/upload - Upload single photo (for trip cover, etc)
router.post(
  "/photos/upload",
  authMiddleware,
  upload.single("photo"),
  async (req: AuthRequest, res) => {
    try {
      const file = req.file as Express.Multer.File;

      if (!file) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "写真ファイルが必要です",
        });
        return;
      }

      const result = await fileService.save(file);
      res.status(200).json({ url: result.url });
    } catch (error) {
      console.error("Upload photo error:", error);
      if (error instanceof multer.MulterError) {
        res.status(400).json({
          code: "UPLOAD_ERROR",
          message: error.message,
        });
        return;
      }
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "写真のアップロードに失敗しました",
      });
    }
  }
);

// POST /api/spots/:spotId/photos - Upload photos
router.post(
  "/spots/:spotId/photos",
  authMiddleware,
  requireAuth,
  upload.array("photos", 20),
  async (req: AuthRequest, res) => {
    try {
      const { spotId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "写真ファイルが必要です",
        });
        return;
      }

      const spot = await prisma.spot.findUnique({
        where: { id: spotId },
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
          message: "このスポットに写真を追加する権限がありません",
        });
        return;
      }

      // Save files and create photo records
      const uploadPromises = files.map(async (file, index) => {
        const result = await fileService.save(file);
        const caption = (req.body as any)[`caption_${index}`] || null;

        return prisma.photo.create({
          data: {
            spotId,
            url: result.url,
            caption,
          },
        });
      });

      const photos = await Promise.all(uploadPromises);

      res.status(201).json(photos);
    } catch (error) {
      console.error("Upload photos error:", error);
      if (error instanceof multer.MulterError) {
        res.status(400).json({
          code: "UPLOAD_ERROR",
          message: error.message,
        });
        return;
      }
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "写真のアップロードに失敗しました",
      });
    }
  }
);

// DELETE /api/photos/:id - Delete photo
router.delete("/:id", authMiddleware, requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        spot: {
          include: {
            trip: true,
          },
        },
      },
    });

    if (!photo) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "写真が見つかりません",
      });
      return;
    }

    if (photo.spot.trip.authorId !== req.userId) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "この写真を削除する権限がありません",
      });
      return;
    }

    // Extract filename from URL and delete file
    const filename = photo.url.split("/").pop();
    if (filename) {
      await fileService.delete(filename).catch((err) => {
        console.error("Failed to delete file:", err);
      });
    }

    await prisma.photo.delete({
      where: { id },
    });

    res.json({ message: "写真を削除しました" });
  } catch (error) {
    console.error("Delete photo error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "写真の削除に失敗しました",
    });
  }
});

export default router;
