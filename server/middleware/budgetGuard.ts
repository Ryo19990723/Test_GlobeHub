import { Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import { AI_CONFIG, TOKEN_PRICING } from "../lib/config";

/**
 * Check if monthly API budget is exceeded
 */
export async function budgetGuard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return next();
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Aggregate usage for current month
    const usages = await prisma.tokenUsage.findMany({
      where: {
        userId,
        yearMonth,
      },
    });

    let totalCost = 0;
    const model = AI_CONFIG.MODEL as keyof typeof TOKEN_PRICING;
    const pricing = TOKEN_PRICING[model] || TOKEN_PRICING["gpt-4o-mini"];

    for (const usage of usages) {
      const cost =
        usage.promptTokens * pricing.input +
        usage.outputTokens * pricing.output;
      totalCost += cost;
    }

    if (totalCost >= AI_CONFIG.API_BUDGET_USD_MONTH) {
      res.status(429).json({
        code: "BUDGET_EXCEEDED",
        message: "今月のAPI利用上限に達しました。来月まで対話機能はご利用いただけません",
        details: {
          used: totalCost.toFixed(4),
          limit: AI_CONFIG.API_BUDGET_USD_MONTH.toFixed(2),
        },
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Budget guard error:", error);
    next(); // Don't block on error
  }
}

/**
 * Record token usage after API call
 */
export async function recordTokenUsage(
  userId: string,
  spotId: string | null,
  promptTokens: number,
  outputTokens: number
) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const totalTokens = promptTokens + outputTokens;

  try {
    await prisma.tokenUsage.upsert({
      where: {
        userId_spotId_yearMonth: {
          userId,
          spotId: spotId || "",
          yearMonth,
        },
      },
      update: {
        promptTokens: { increment: promptTokens },
        outputTokens: { increment: outputTokens },
        totalTokens: { increment: totalTokens },
        requestCount: { increment: 1 },
      },
      create: {
        userId,
        spotId,
        yearMonth,
        promptTokens,
        outputTokens,
        totalTokens,
        requestCount: 1,
      },
    });
  } catch (error) {
    console.error("Failed to record token usage:", error);
  }
}
