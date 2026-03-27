import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateQuery, ValidatedRequest } from "../middleware/validate";

const router = Router();

const HomeQuerySchema = z.object({
  recentIds: z.string().optional(),
});

const tripInclude = {
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
};

function formatTrip(trip: any, userId?: string) {
  return {
    id: trip.id,
    title: trip.title,
    summary: trip.summary,
    city: trip.city,
    country: trip.country,
    heroUrl: trip.heroUrl,
    startDate: trip.startDate,
    endDate: trip.endDate,
    peopleCount: trip.peopleCount,
    companyType: trip.companyType,
    publishedAt: trip.publishedAt,
    author: trip.author ? {
      id: trip.author.id,
      displayName: trip.author.displayName,
    } : null,
    spots: trip.spots?.map((s: any) => ({
      id: s.id,
      photos: s.photos?.map((p: any) => ({ url: p.url })),
    })),
    _count: {
      likes: Number(trip._count?.likes || 0),
      saves: Number(trip._count?.saves || 0),
      spots: Number(trip._count?.spots || 0),
    },
    isLiked: userId ? (trip.likes as any[])?.length > 0 : false,
    isSaved: userId ? (trip.saves as any[])?.length > 0 : false,
  };
}

router.get(
  "/feed",
  authMiddleware,
  validateQuery(HomeQuerySchema),
  async (req: ValidatedRequest & AuthRequest, res) => {
    try {
      const { recentIds } = req.validated!.query;
      const userId = req.userId;

      const recentIdList = recentIds ? recentIds.split(",").filter(Boolean).slice(0, 10) : [];

      const [latestTrips, savedTrips, likedOrSavedCities, recentTrips] = await Promise.all([
        prisma.trip.findMany({
          where: { status: "PUBLISHED" },
          include: {
            ...tripInclude,
            likes: userId ? { where: { userId }, select: { userId: true } } : false,
            saves: userId ? { where: { userId }, select: { userId: true } } : false,
          },
          orderBy: { publishedAt: "desc" },
          take: 10,
        }),

        userId
          ? prisma.save.findMany({
              where: { userId },
              include: {
                trip: {
                  include: {
                    ...tripInclude,
                    likes: { where: { userId }, select: { userId: true } },
                    saves: { where: { userId }, select: { userId: true } },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 10,
            })
          : [],

        userId
          ? prisma.trip.findMany({
              where: {
                OR: [
                  { likes: { some: { userId } } },
                  { saves: { some: { userId } } },
                ],
              },
              select: { city: true },
              distinct: ["city"],
            })
          : [],

        recentIdList.length > 0
          ? prisma.trip.findMany({
              where: {
                id: { in: recentIdList },
                status: "PUBLISHED",
              },
              include: {
                ...tripInclude,
                likes: userId ? { where: { userId }, select: { userId: true } } : false,
                saves: userId ? { where: { userId }, select: { userId: true } } : false,
              },
            })
          : [],
      ]);

      const likedCities = likedOrSavedCities.map((t) => t.city).filter(Boolean) as string[];

      let recommendedTrips: any[] = [];
      if (likedCities.length > 0 && userId) {
        const likedOrSavedTripIds = await prisma.trip.findMany({
          where: {
            OR: [
              { likes: { some: { userId } } },
              { saves: { some: { userId } } },
            ],
          },
          select: { id: true },
        });
        const excludeIds = likedOrSavedTripIds.map((t) => t.id);

        recommendedTrips = await prisma.trip.findMany({
          where: {
            status: "PUBLISHED",
            city: { in: likedCities },
            id: { notIn: excludeIds },
          },
          include: {
            ...tripInclude,
            likes: { where: { userId }, select: { userId: true } },
            saves: { where: { userId }, select: { userId: true } },
          },
          orderBy: { publishedAt: "desc" },
          take: 10,
        });
      }

      const sortedRecentTrips = recentIdList
        .map((id: string) => recentTrips.find((t: any) => t.id === id))
        .filter(Boolean);

      res.json({
        recent: sortedRecentTrips.map((t: any) => formatTrip(t, userId)),
        latest: latestTrips.map((t) => formatTrip(t, userId)),
        recommended: recommendedTrips.map((t) => formatTrip(t, userId)),
        saved: savedTrips.map((s) => formatTrip(s.trip, userId)),
      });
    } catch (error) {
      console.error("Home feed error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "フィードの取得に失敗しました",
      });
    }
  }
);

export default router;
