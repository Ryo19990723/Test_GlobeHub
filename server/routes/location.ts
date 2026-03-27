import { Router } from "express";
import multer from "multer";
import ExifReader from "exifreader";
import { authMiddleware } from "../middleware/auth";
import { locationProvider } from "../lib/locationProvider";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/location/candidates - Get location candidates
router.get("/candidates", authMiddleware, async (req, res) => {
  try {
    const { method, lat, lng, q, radius, limit } = req.query;

    if (!method || !["current", "search"].includes(method as string)) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "method must be 'current' or 'search'",
      });
      return;
    }

    const radiusNum = radius ? parseInt(radius as string) : 200;
    const limitNum = limit ? parseInt(limit as string) : 20;

    if (method === "search") {
      if (!q) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Query parameter 'q' is required for search method",
        });
        return;
      }

      const searchLat = lat ? parseFloat(lat as string) : undefined;
      const searchLng = lng ? parseFloat(lng as string) : undefined;

      const candidates = await locationProvider.searchPlaces(
        q as string,
        searchLat,
        searchLng,
        limitNum
      );

      res.json({ candidates });
      return;
    }

    // method === "current"
    if (!lat || !lng) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "lat and lng are required for current method",
      });
      return;
    }

    const baseLat = parseFloat(lat as string);
    const baseLng = parseFloat(lng as string);

    if (isNaN(baseLat) || isNaN(baseLng)) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid lat/lng values",
      });
      return;
    }

    const candidates = await locationProvider.nearbyPlaces(baseLat, baseLng, radiusNum, limitNum);

    res.json({ candidates });
  } catch (error) {
    console.error("Get location candidates error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "位置候補の取得に失敗しました",
    });
  }
});

// POST /api/location/candidates/photo - Get candidates from photo EXIF
router.post("/candidates/photo", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Photo file is required",
      });
      return;
    }

    const tags = ExifReader.load(req.file.buffer);

    if (!tags.GPSLatitude || !tags.GPSLongitude) {
      res.status(400).json({
        code: "NO_GPS_DATA",
        message: "この写真には位置情報が含まれていません",
      });
      return;
    }

    const lat = parseFloat(tags.GPSLatitude.description);
    const lng = parseFloat(tags.GPSLongitude.description);

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({
        code: "INVALID_GPS_DATA",
        message: "写真の位置情報が不正です",
      });
      return;
    }

    const radiusNum = req.body.radius ? parseInt(req.body.radius) : 200;
    const limitNum = req.body.limit ? parseInt(req.body.limit) : 20;

    const candidates = await locationProvider.nearbyPlaces(lat, lng, radiusNum, limitNum);

    // Mark candidates as from photo source
    const photoCandidates = candidates.map(c => ({ ...c, source: "photo" as const }));

    res.json({
      candidates: photoCandidates,
      exif: {
        lat,
        lng,
        datetime: tags.DateTime?.description || tags.DateTimeOriginal?.description,
      },
    });
  } catch (error) {
    console.error("Photo EXIF candidates error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "写真からの位置情報取得に失敗しました",
    });
  }
});

// GET /location/candidates/photo - Get candidates from uploaded photo EXIF
router.get(
  "/candidates/photo",
  authMiddleware,
  async (req: any, res: any) => {
    try {
      const { spotId, lat: queryLat, lng: queryLng } = req.query;

      let lat: number | undefined;
      let lng: number | undefined;

      // クエリパラメータから座標を取得
      if (queryLat && queryLng) {
        lat = parseFloat(queryLat as string);
        lng = parseFloat(queryLng as string);
      }

      // spotIdが指定されている場合、既存写真のEXIFを取得
      if (spotId && !lat && !lng) {
        const { prisma } = await import("../db");
        const spot = await prisma.spot.findUnique({
          where: { id: spotId as string },
          include: {
            photos: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        });

        if (spot?.photos?.[0]?.url) {
          try {
            const fs = await import("fs/promises");
            const path = await import("path");
            const photoPath = spot.photos[0].url.replace("/uploads/", "");
            const fullPath = path.join("uploads", photoPath);
            const buffer = await fs.readFile(fullPath);
            const tags = ExifReader.load(buffer);

            if (tags.GPSLatitude && tags.GPSLongitude) {
              lat = parseFloat(tags.GPSLatitude.description);
              lng = parseFloat(tags.GPSLongitude.description);
            }
          } catch (exifError) {
            console.error("EXIF読み取りエラー:", exifError);
          }
        }
      }

      // 座標がない場合は空配列を返す（エラーにしない）
      if (!lat || !lng) {
        res.json({ candidates: [], exif: null });
        return;
      }

      // 座標を中心に候補を取得
      const candidates = await locationProvider.nearbyPlaces(lat, lng, 200, 20);
      const photoCandidates = candidates.map(c => ({ ...c, source: "photo" as const }));

      res.json({ 
        candidates: photoCandidates,
        exif: { lat, lng }
      });
    } catch (error) {
      console.error("Photo candidates error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "写真からの候補取得に失敗しました",
      });
    }
  }
);

// Legacy endpoint for backward compatibility
router.get("/suggestions", authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "緯度経度が必要です",
      });
      return;
    }

    const baseLat = parseFloat(lat as string);
    const baseLng = parseFloat(lng as string);

    if (isNaN(baseLat) || isNaN(baseLng)) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "有効な緯度経度を指定してください",
      });
      return;
    }

    const delta = 0.002;
    const suggestions = [
      {
        lat: baseLat,
        lng: baseLng,
        name: "現在地",
        address: "あなたの現在地",
        confidence: 1.0,
      },
      {
        lat: baseLat + delta * 0.5,
        lng: baseLng + delta * 0.3,
        name: "近くの観光スポット",
        address: "付近の名所",
        confidence: 0.85,
      },
      {
        lat: baseLat - delta * 0.3,
        lng: baseLng + delta * 0.5,
        name: "近くのレストラン",
        address: "近隣の飲食店",
        confidence: 0.75,
      },
      {
        lat: baseLat + delta * 0.7,
        lng: baseLng - delta * 0.4,
        name: "近くの公園",
        address: "周辺の公園",
        confidence: 0.70,
      },
    ];

    res.json({ suggestions });
  } catch (error) {
    console.error("Get location suggestions error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "位置情報の取得に失敗しました",
    });
  }
});

export default router;