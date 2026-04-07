import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

// GET /api/users/:userId - 公開プロフィール
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trips: {
          where: { status: "PUBLISHED" },
          orderBy: { updatedAt: "desc" },
          include: {
            spots: {
              take: 1,
              include: { photos: { take: 1 } },
            },
          },
        },
        _count: {
          select: {
            trips: { where: { status: "PUBLISHED" } },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ code: "USER_NOT_FOUND", message: "ユーザーが見つかりません" });
      return;
    }

    const cities = [...new Set(user.trips.filter((t) => t.city).map((t) => t.city as string))];

    const trips = user.trips.map((trip) => ({
      id: trip.id,
      title: trip.title,
      city: trip.city,
      country: trip.country,
      startDate: trip.startDate,
      endDate: trip.endDate,
      heroUrl: trip.heroUrl,
      updatedAt: trip.updatedAt,
      spotPhotoUrl: trip.spots[0]?.photos[0]?.url || null,
    }));

    res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        instagramUrl: user.instagramUrl,
        xUrl: user.xUrl,
        location: user.location,
        tripCount: user._count.trips,
      },
      cities,
      trips,
    });
  } catch (error) {
    console.error("Get public profile error:", error);
    res.status(500).json({ code: "SERVER_ERROR", message: "プロフィールの取得に失敗しました" });
  }
});

export default router;
