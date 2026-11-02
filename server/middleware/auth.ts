import { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { prisma } from "../db";

import { SESSION_COOKIE, sessionCookieOptions } from "../lib/session";

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // signedCookies drops tampered values (they come back as false)
    let userId = (req.signedCookies[SESSION_COOKIE] || undefined) as string | undefined;

    if (!userId) {
      const user = await prisma.user.create({
        data: {
          displayName: null,
        },
      });
      userId = user.id;

      res.cookie(SESSION_COOKIE, userId, sessionCookieOptions);
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

        res.cookie(SESSION_COOKIE, userId, sessionCookieOptions);
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
