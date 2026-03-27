import { Router, Response } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { authMiddleware, AuthRequest, requireAuth } from "../middleware/auth";
import { prisma } from "../db";

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1, "表示名は必須です").max(50, "表示名は50文字以内で入力してください"),
  bio: z.string().max(200, "ひとことは200文字以内で入力してください").optional().nullable(),
  instagramUrl: z.string().url("有効なURLを入力してください").optional().nullable().or(z.literal("")),
  xUrl: z.string().url("有効なURLを入力してください").optional().nullable().or(z.literal("")),
  location: z.string().max(100, "居住地は100文字以内で入力してください").optional().nullable(),
});

function sanitizeUser(user: any) {
  return {
    id: user.id,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    instagramUrl: user.instagramUrl,
    xUrl: user.xUrl,
    location: user.location,
    isRegistered: user.isRegistered,
    createdAt: user.createdAt,
  };
}

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        code: "UNAUTHORIZED",
        message: "認証が必要です",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        trips: {
          orderBy: { updatedAt: "desc" },
          include: {
            spots: {
              take: 1,
              include: { photos: { take: 1 } },
            },
          },
        },
        _count: {
          select: { trips: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "ユーザーが見つかりません",
      });
      return;
    }

    const cities = [...new Set(user.trips.filter(t => t.city).map(t => t.city as string))];

    const trips = user.trips.map((trip) => ({
      id: trip.id,
      title: trip.title,
      city: trip.city,
      country: trip.country,
      status: trip.status,
      startDate: trip.startDate,
      endDate: trip.endDate,
      heroUrl: trip.heroUrl,
      updatedAt: trip.updatedAt,
      spotPhotoUrl: trip.spots[0]?.photos[0]?.url || null,
    }));

    res.json({
      user: {
        ...sanitizeUser(user),
        tripCount: user._count.trips,
      },
      cities,
      trips,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "プロフィールの取得に失敗しました",
    });
  }
});

router.put("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        code: "UNAUTHORIZED",
        message: "認証が必要です",
      });
      return;
    }

    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: validation.error.errors[0]?.message || "入力内容に誤りがあります",
        errors: validation.error.errors,
      });
      return;
    }

    const { displayName, bio, instagramUrl, xUrl, location } = validation.data;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        displayName,
        bio: bio || null,
        instagramUrl: instagramUrl || null,
        xUrl: xUrl || null,
        location: location || null,
      },
    });

    res.json({
      user: sanitizeUser(user),
      message: "プロフィールを更新しました",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "プロフィールの更新に失敗しました",
    });
  }
});

router.post("/avatar", authMiddleware, upload.single("avatar"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        code: "UNAUTHORIZED",
        message: "認証が必要です",
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        code: "NO_FILE",
        message: "ファイルがアップロードされていません",
      });
      return;
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl },
    });

    res.json({
      avatarUrl: user.avatarUrl,
      message: "アバターを更新しました",
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "アバターのアップロードに失敗しました",
    });
  }
});

export default router;
