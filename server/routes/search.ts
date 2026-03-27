import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateQuery, ValidatedRequest } from "../middleware/validate";

const router = Router();

// Schemas
const SearchQuerySchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  purpose: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/search/trips - Search trips
router.get(
  "/trips",
  authMiddleware,
  validateQuery(SearchQuerySchema),
  async (req: ValidatedRequest & AuthRequest, res) => {
    try {
      const query = req.validated!.query;
      const { page, pageSize, query: searchQuery, city, purpose, category } = query;

      const skip = (page - 1) * pageSize;

      const where: any = {
        status: "PUBLISHED",
      };

      const conditions: any[] = [];

      if (searchQuery) {
        conditions.push({
          OR: [
            { title: { contains: searchQuery } },
            { summary: { contains: searchQuery } },
            {
              spots: {
                some: {
                  OR: [
                    { name: { contains: searchQuery } },
                    { notes: { contains: searchQuery } },
                    { address: { contains: searchQuery } },
                  ],
                },
              },
            },
          ],
        });
      }

      if (city) {
        conditions.push({
          city: { contains: city },
        });
      }

      // For MVP, purpose and category are simple text filters
      // In the future, these would be proper tags/categories
      if (purpose) {
        conditions.push({
          OR: [
            { summary: { contains: purpose } },
            {
              spots: {
                some: {
                  notes: { contains: purpose },
                },
              },
            },
          ],
        });
      }

      if (category) {
        conditions.push({
          OR: [
            { summary: { contains: category } },
            {
              spots: {
                some: {
                  notes: { contains: category },
                },
              },
            },
          ],
        });
      }

      if (conditions.length > 0) {
        where.AND = conditions;
      }

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
          orderBy: {
            createdAt: "desc",
          },
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
      console.error("Search trips error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "検索に失敗しました",
      });
    }
  }
);

export default router;
