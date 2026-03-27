import { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { prisma } from "../db";

const COOKIE_NAME = "GH-ANON-ID";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let userId = req.cookies[COOKIE_NAME] as string | undefined;

    if (!userId) {
      const user = await prisma.user.create({
        data: {
          displayName: null,
        },
      });
      userId = user.id;

      res.cookie(COOKIE_NAME, userId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: COOKIE_MAX_AGE,
      });
    } else {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        const newUser = await prisma.user.create({
          data: {
            displayName: null,
          },
        });
        userId = newUser.id;

        res.cookie(COOKIE_NAME, userId, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: COOKIE_MAX_AGE,
        });
      }
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      code: "AUTH_ERROR",
      message: "認証エラーが発生しました",
    });
  }
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.userId) {
    res.status(401).json({
      code: "UNAUTHORIZED",
      message: "認証が必要です",
    });
    return;
  }
  next();
}
