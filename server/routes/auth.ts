import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { prisma } from "../db";

const router = Router();

const COOKIE_NAME = "GH-ANON-ID";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;

const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  displayName: z.string().min(1, "表示名は必須です").max(50, "表示名は50文字以内で入力してください"),
  agreeToTerms: z.boolean().refine((v) => v === true, "利用規約への同意が必要です"),
});

const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

function sanitizeUser(user: any, includeEmail = false) {
  const result: any = {
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
  if (includeEmail) {
    result.email = user.email;
  }
  return result;
}

router.post("/anon", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      userId: req.userId,
      message: "匿名セッションが作成されました",
    });
  } catch (error) {
    console.error("Create anon session error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "セッションの作成に失敗しました",
    });
  }
});

router.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: validation.error.errors[0]?.message || "入力内容に誤りがあります",
        errors: validation.error.errors,
      });
      return;
    }

    const { email, password, displayName } = validation.data;

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        code: "EMAIL_EXISTS",
        message: "このメールアドレスは既に登録されています",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const anonUserId = req.cookies[COOKIE_NAME] as string | undefined;
    let user;

    if (anonUserId) {
      const anonUser = await prisma.user.findUnique({
        where: { id: anonUserId },
      });

      if (anonUser && !anonUser.isRegistered) {
        user = await prisma.user.update({
          where: { id: anonUserId },
          data: {
            email,
            passwordHash,
            displayName,
            isRegistered: true,
          },
        });
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          isRegistered: true,
        },
      });
    }

    res.cookie(COOKIE_NAME, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
    });

    res.status(201).json({
      user: sanitizeUser(user, true),
      message: "登録が完了しました",
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "登録に失敗しました",
    });
  }
});

router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: validation.error.errors[0]?.message || "入力内容に誤りがあります",
        errors: validation.error.errors,
      });
      return;
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({
        code: "INVALID_CREDENTIALS",
        message: "メールアドレスまたはパスワードが正しくありません",
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({
        code: "INVALID_CREDENTIALS",
        message: "メールアドレスまたはパスワードが正しくありません",
      });
      return;
    }

    res.cookie(COOKIE_NAME, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
    });

    res.json({
      user: sanitizeUser(user, true),
      message: "ログインしました",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "ログインに失敗しました",
    });
  }
});

router.post("/logout", (req: AuthRequest, res: Response) => {
  res.clearCookie(COOKIE_NAME);
  res.json({
    message: "ログアウトしました",
  });
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
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

    res.json({
      user: {
        ...sanitizeUser(user, true),
        tripCount: user._count.trips,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "ユーザー情報の取得に失敗しました",
    });
  }
});

export default router;
