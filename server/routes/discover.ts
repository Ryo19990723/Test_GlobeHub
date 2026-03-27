import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/discover/cities - Get cities with trip aggregation
router.get("/cities", authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Get all published trips grouped by city
    const trips = await prisma.trip.findMany({
      where: {
        status: "PUBLISHED",
        city: { not: null },
        country: { not: null },
      },
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
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    // Group by city
    const cityMap = new Map<string, {
      city: string;
      country: string;
      tripCount: number;
      heroUrl: string | null;
      tagline: string | null;
      trips: typeof trips;
    }>();

    for (const trip of trips) {
      if (!trip.city || !trip.country) continue;

      const cityKey = `${trip.city}-${trip.country}`;
      
      if (!cityMap.has(cityKey)) {
        // Extract hero photo from summary JSON or first spot photo
        let heroUrl: string | null = null;
        try {
          if (trip.summary) {
            const summary = JSON.parse(trip.summary);
            heroUrl = summary.heroPhotoUrl || null;
          }
        } catch (e) {
          // Ignore parse errors
        }
        if (!heroUrl && trip.spots[0]?.photos[0]) {
          heroUrl = trip.spots[0].photos[0].url;
        }

        // Extract tagline from summary
        let tagline: string | null = null;
        if (trip.summary) {
          try {
            const text = typeof trip.summary === 'string' && trip.summary.startsWith('{') 
              ? JSON.parse(trip.summary).text || trip.summary
              : trip.summary;
            tagline = text.substring(0, 100);
          } catch (e) {
            tagline = trip.summary.substring(0, 100);
          }
        }

        cityMap.set(cityKey, {
          city: trip.city,
          country: trip.country,
          tripCount: 0,
          heroUrl,
          tagline,
          trips: [],
        });
      }

      const cityData = cityMap.get(cityKey)!;
      cityData.tripCount++;
      cityData.trips.push(trip);
      
      // Update hero if not set
      if (!cityData.heroUrl && trip.spots[0]?.photos[0]) {
        cityData.heroUrl = trip.spots[0].photos[0].url;
      }
    }

    // Convert to array and create sections
    const cities = Array.from(cityMap.values()).map((data, index) => ({
      id: `${data.city}-${data.country}`,
      name: data.city,
      country: data.country,
      tagline: data.tagline || `${data.city}の旅`,
      tripCount: data.tripCount,
      heroUrl: data.heroUrl || '',
    }));

    // Sort by trip count for recommended
    const recommended = [...cities].sort((a, b) => b.tripCount - a.tripCount).slice(0, 10);
    
    // Recent: latest 10
    const recent = cities.slice(0, 10);
    
    // Campaign: top 3
    const campaign = recommended.slice(0, 3);

    res.json({
      recent,
      recommended,
      campaign,
    });
  } catch (error) {
    console.error("Fetch cities error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "都市情報の取得に失敗しました",
    });
  }
});

// GET /api/discover/cities/:cityId/posts - Get posts for a city
router.get("/cities/:cityId/posts", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { cityId } = req.params;
    // cityId format: "city-country"
    const parts = cityId.split('-');
    const city = parts.slice(0, -1).join('-');
    const country = parts[parts.length - 1];

    const trips = await prisma.trip.findMany({
      where: {
        status: "PUBLISHED",
        city: { contains: city },
        country: { contains: country },
      },
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
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    const posts = trips.map((trip) => {
      // Extract hero photo
      let heroUrl = '';
      try {
        if (trip.summary) {
          const summary = JSON.parse(trip.summary);
          heroUrl = summary.heroPhotoUrl || '';
        }
      } catch (e) {
        // Ignore
      }
      if (!heroUrl && trip.spots[0]?.photos[0]) {
        heroUrl = trip.spots[0].photos[0].url;
      }

      // Extract summary text
      let summaryText = trip.summary || '';
      try {
        if (summaryText.startsWith('{')) {
          const parsed = JSON.parse(summaryText);
          summaryText = parsed.text || parsed.summary || '';
        }
      } catch (e) {
        // Keep as is
      }
      if (summaryText.length > 100) {
        summaryText = summaryText.substring(0, 100) + '...';
      }

      return {
        id: trip.id,
        cityId,
        title: trip.title,
        summary: summaryText,
        heroUrl,
        user: {
          name: trip.author?.displayName || '匿名ユーザー',
          avatar: `https://i.pravatar.cc/150?u=${trip.authorId}`,
        },
        createdAt: trip.publishedAt?.toISOString() || trip.createdAt.toISOString(),
        spotCount: trip._count.spots,
        likeCount: trip._count.likes,
      };
    });

    res.json(posts);
  } catch (error) {
    console.error("Fetch city posts error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "投稿の取得に失敗しました",
    });
  }
});

// GET /api/discover/posts/:postId - Get post detail
router.get("/posts/:postId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id: postId },
      include: {
        author: true,
        spots: {
          include: {
            photos: true,
            conversation: {
              include: {
                turns: {
                  orderBy: {
                    createdAt: "asc",
                  },
                },
              },
            },
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
      },
    });

    if (!trip) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "投稿が見つかりません",
      });
      return;
    }

    if (trip.status !== "PUBLISHED") {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "この投稿は公開されていません",
      });
      return;
    }

    // Extract hero photo
    let heroUrl = '';
    try {
      if (trip.summary) {
        const summary = JSON.parse(trip.summary);
        heroUrl = summary.heroPhotoUrl || '';
      }
    } catch (e) {
      // Ignore
    }
    if (!heroUrl && trip.spots[0]?.photos[0]) {
      heroUrl = trip.spots[0].photos[0].url;
    }

    // Extract summary text
    let summaryText = trip.summary || '';
    try {
      if (summaryText.startsWith('{')) {
        const parsed = JSON.parse(summaryText);
        summaryText = parsed.text || parsed.summary || '';
      }
    } catch (e) {
      // Keep as is
    }

    // Extract Q&A from conversations
    const qas: Array<{ q: string; a: string }> = [];
    for (const spot of trip.spots) {
      if (spot.conversation?.turns) {
        for (let i = 0; i < spot.conversation.turns.length; i += 2) {
          const questionTurn = spot.conversation.turns[i];
          const answerTurn = spot.conversation.turns[i + 1];
          if (questionTurn && answerTurn && questionTurn.role === 'assistant' && answerTurn.role === 'user') {
            qas.push({
              q: questionTurn.content,
              a: answerTurn.content,
            });
          }
        }
      }
    }

    const post = {
      id: trip.id,
      cityId: trip.city && trip.country ? `${trip.city}-${trip.country}` : '',
      title: trip.title,
      summary: summaryText,
      heroUrl,
      user: {
        name: trip.author?.displayName || '匿名ユーザー',
        avatar: `https://i.pravatar.cc/150?u=${trip.authorId}`,
      },
      createdAt: trip.publishedAt?.toISOString() || trip.createdAt.toISOString(),
      spots: trip.spots.map((spot) => ({
        id: spot.id,
        name: spot.name || '名称未設定',
        photos: spot.photos.map(p => p.url),
        note: spot.notes || '',
      })),
      qas,
    };

    res.json(post);
  } catch (error) {
    console.error("Fetch post detail error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "投稿詳細の取得に失敗しました",
    });
  }
});

// GET /api/discover/cities/:cityId/spots - Get spots for a city
router.get("/cities/:cityId/spots", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { cityId } = req.params;
    const parts = cityId.split('-');
    const city = parts.slice(0, -1).join('-');
    const country = parts[parts.length - 1];

    const trips = await prisma.trip.findMany({
      where: {
        status: "PUBLISHED",
        city: { contains: city },
        country: { contains: country },
      },
      include: {
        spots: {
          include: {
            photos: {
              take: 4,
            },
          },
        },
      },
    });

    // Flatten all spots
    const allSpots = await prisma.spot.findMany({
      where: {
        tripId: { in: trips.map(t => t.id) },
      },
      include: {
        photos: {
          take: 4,
        },
      },
    });

    const spots = allSpots.map((spot: any) => {
      let category = '観光スポット';
      try {
        if (spot.meta) {
          const meta = JSON.parse(spot.meta);
          category = meta.category || category;
        }
      } catch (e) {
        // Ignore
      }

      return {
        id: spot.id,
        cityId,
        name: spot.name || '名称未設定',
        category,
        summary: spot.notes?.substring(0, 100) || '',
        photos: spot.photos.map((p: any) => p.url).slice(0, 4),
        mapUrl: spot.lat && spot.lng ? `https://maps.google.com/?q=${spot.lat},${spot.lng}` : undefined,
      };
    });

    res.json(spots);
  } catch (error) {
    console.error("Fetch city spots error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "スポット情報の取得に失敗しました",
    });
  }
});

// GET /api/discover/cities/:cityId/grouped-spots - Get spots grouped by location
router.get("/cities/:cityId/grouped-spots", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { cityId } = req.params;
    const decoded = decodeURIComponent(cityId);
    const parts = decoded.split("-");
    const city = parts.slice(0, -1).join("-") || parts[0];
    const country = parts.length > 1 ? parts[parts.length - 1] : undefined;

    const whereClause: Record<string, unknown> = {
      status: "PUBLISHED",
      city: { contains: city },
    };
    if (country) whereClause.country = { contains: country };

    const trips = await prisma.trip.findMany({
      where: whereClause as any,
      include: {
        author: { select: { id: true, displayName: true } },
        spots: {
          include: {
            photos: { take: 4 },
          },
        },
      },
    });

    // Group spots by lat/lng rounded to 4 decimal places (~11m)
    const groupMap = new Map<string, Array<any>>();

    for (const trip of trips) {
      for (const spot of trip.spots) {
        if (spot.lat == null || spot.lng == null) continue;
        const key = `${Math.round(spot.lat * 10000) / 10000}_${Math.round(spot.lng * 10000) / 10000}`;
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push({
          ...spot,
          authorName: trip.author?.displayName ?? null,
        });
      }
    }

    // Helper: majority vote for a field
    const majority = (spots: any[], field: string): string | null => {
      const counts = new Map<string, number>();
      for (const s of spots) {
        const val = s[field];
        if (val) counts.set(val, (counts.get(val) ?? 0) + 1);
      }
      let best: string | null = null;
      let bestCount = 0;
      Array.from(counts.entries()).forEach(([val, count]) => {
        if (count > bestCount) { bestCount = count; best = val; }
      });
      return best;
    };

    const result: any[] = [];

    Array.from(groupMap.entries()).forEach(([key, spots]) => {
      // Average rating
      const ratings = spots.map((s: any) => s.rating).filter((r: any): r is number => r != null && r > 0);
      const avgRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
          : null;

      // Collect unique photos (up to 6)
      const photos: string[] = [];
      for (const s of spots) {
        for (const p of s.photos ?? []) {
          if (photos.length < 6 && !photos.includes(p.url)) photos.push(p.url);
        }
      }

      // Impressions per user
      const impressions = spots
        .filter((s: any) => s.impressionRemarks?.trim())
        .map((s: any) => ({ userName: s.authorName ?? "匿名", text: s.impressionRemarks as string }));

      const [latStr, lngStr] = key.split("_");

      result.push({
        key,
        placeName: majority(spots, "placeName") ?? majority(spots, "name") ?? "名称未設定",
        lat: parseFloat(latStr),
        lng: parseFloat(lngStr),
        address: spots.find((s: any) => s.address)?.address ?? null,
        category: majority(spots, "category"),
        cost: majority(spots, "cost"),
        duration: majority(spots, "duration"),
        avgRating,
        ratingCount: ratings.length,
        photos,
        impressions,
        tripCount: spots.length,
      });
    });

    // Sort by tripCount descending
    result.sort((a, b) => b.tripCount - a.tripCount);

    res.json(result);
  } catch (error) {
    console.error("Fetch grouped spots error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "スポット情報の取得に失敗しました",
    });
  }
});

// GET /api/discover/spots/:spotId - Get spot detail
router.get("/spots/:spotId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { spotId } = req.params;

    const spot = await prisma.spot.findUnique({
      where: { id: spotId },
      include: {
        photos: {
          take: 4,
        },
        trip: {
          select: {
            status: true,
            city: true,
            country: true,
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

    if (spot.trip.status !== "PUBLISHED") {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "このスポットは公開されていません",
      });
      return;
    }

    let category = '観光スポット';
    try {
      if ((spot as any).meta) {
        const meta = JSON.parse((spot as any).meta);
        category = meta.category || category;
      }
    } catch (e) {
      // Ignore
    }

    const cityId = spot.trip.city && spot.trip.country 
      ? `${spot.trip.city}-${spot.trip.country}`
      : '';

    res.json({
      id: spot.id,
      cityId,
      name: spot.name || '名称未設定',
      category,
      summary: spot.notes || '',
      photos: spot.photos.map((p: any) => p.url).slice(0, 4),
      mapUrl: spot.lat && spot.lng ? `https://maps.google.com/?q=${spot.lat},${spot.lng}` : undefined,
    });
  } catch (error) {
    console.error("Fetch spot detail error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "スポット詳細の取得に失敗しました",
    });
  }
});

export default router;
