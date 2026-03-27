import { Router } from "express";
import OpenAI from "openai";
import { authMiddleware, requireAuth, AuthRequest } from "../middleware/auth";
import { budgetGuard, recordTokenUsage } from "../middleware/budgetGuard";
import { aiChatRateLimiter } from "../middleware/rateLimit";
import { prisma } from "../db";
import { AI_CONFIG } from "../lib/config";
import { estimateTokens, truncateToTokens, compressHistory } from "../lib/tokenUtils";
import { responseCache } from "../lib/responseCache";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-placeholder",
});

const MAX_TURNS = 3;

// GET /ai/chat/:spotId - Get conversation history
router.get(
  "/chat/:spotId",
  authMiddleware,
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const { spotId } = req.params;

      const spot = await prisma.spot.findUnique({
        where: { id: spotId },
        include: {
          trip: true,
          conversation: {
            include: {
              turns: {
                orderBy: { createdAt: "asc" },
              },
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

      if (spot.trip.authorId !== req.userId) {
        res.status(403).json({
          code: "FORBIDDEN",
          message: "このスポットの会話にアクセスする権限がありません",
        });
        return;
      }

      const turns = spot.conversation?.turns || [];
      const pairs = Math.floor(turns.length / 2);
      const remaining = MAX_TURNS - pairs;

      res.json({
        turns: turns.map((t) => ({
          id: t.id,
          role: t.role,
          content: t.content,
          createdAt: t.createdAt,
        })),
        pairs,
        remaining,
      });
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "会話の取得に失敗しました",
      });
    }
  }
);

// POST /ai/chat - Send message and get AI response
router.post(
  "/chat",
  authMiddleware,
  requireAuth,
  budgetGuard,
  aiChatRateLimiter,
  async (req: AuthRequest, res) => {
    try {
      const { spotId, userText: rawUserText } = req.body;

      if (!spotId || !rawUserText || !rawUserText.trim()) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "スポットIDとメッセージが必要です",
        });
        return;
      }

      // Note: Cache check moved after conversation creation and validation
      // to ensure new turns are always recorded

      // Truncate long user input (500 tokens ≈ 1000 chars for Japanese)
      const userText = truncateToTokens(rawUserText.trim(), 500);

      const spot = await prisma.spot.findUnique({
        where: { id: spotId },
        include: {
          trip: true,
          photos: true,
          conversation: {
            include: {
              turns: {
                orderBy: { createdAt: "asc" },
              },
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

      if (spot.trip.authorId !== req.userId) {
        res.status(403).json({
          code: "FORBIDDEN",
          message: "このスポットの会話に参加する権限がありません",
        });
        return;
      }

      // 写真必須チェック: 1枚以上の写真が必要
      if (!spot.photos || spot.photos.length === 0) {
        res.status(400).json({
          code: "PHOTOS_REQUIRED",
          message: "先に写真を1枚以上追加してください",
        });
        return;
      }

      // 位置必須チェック: lat/lngが設定されていることを確認
      if (!spot.lat || !spot.lng) {
        res.status(400).json({
          code: "LOCATION_REQUIRED",
          message: "先に位置を確定してください",
        });
        return;
      }

      let conversation = spot.conversation;
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            spotId: spot.id,
          },
          include: {
            turns: {
              orderBy: { createdAt: "asc" },
            },
          },
        });
      }

      // Check turn limit BEFORE creating new user turn
      const currentTurns = conversation.turns.length;
      const currentPairs = Math.floor(currentTurns / 2);

      // If we already have 3 pairs (6 turns total), reject
      if (currentPairs >= MAX_TURNS) {
        res.status(400).json({
          code: "MAX_TURNS_REACHED",
          message: "このスポットの対話は上限に達しました",
        });
        return;
      }

      // Save user turn
      const userTurn = await prisma.turn.create({
        data: {
          conversationId: conversation.id,
          role: "user",
          content: userText,
        },
      });

      // Check cache AFTER saving user turn
      const cachedResponse = responseCache.get(spotId, userText);
      let assistantResponse: string;
      let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;

      if (cachedResponse) {
        // Use cached response without API call
        assistantResponse = cachedResponse;
      } else {
        // Build optimized messages for OpenAI (compressed history)
        const isFinalTurn = currentPairs + 1 === MAX_TURNS;

        // Short system prompt (150-200 tokens)
        const systemPrompt = `旅の聞き出しAI。スポット:${spot.name || "不明"}(${spot.lat || "?"}, ${spot.lng || "?"}) 目的:${spot.trip.purpose || "不明"}。
各ターンは具体例を引き出す1-2問+末尾に《要約: …》1行。回答は${AI_CONFIG.MAX_OUTPUT_TOKENS}token以内。
${isFinalTurn ? "3ターン目:見出し+箇条書き3-5点でまとめる。" : `${currentPairs + 1}/${MAX_TURNS}ターン目。`}冗長・一般論は避ける。`;

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: systemPrompt,
          },
        ];

        // Add compressed history (last 2 turns only, summarized to 3 lines max)
        if (conversation.turns.length > 0) {
          const historyCompressed = compressHistory(conversation.turns);
          if (historyCompressed) {
            messages.push({
              role: "system",
              content: `前ターン要点:\n${historyCompressed}`,
            });
          }
        }

        // Add current user message
        messages.push({
          role: "user",
          content: userText,
        });

        // Special instruction for final turn
        if (isFinalTurn) {
          messages.push({
            role: "system",
            content: `最終ターン。共感+【会話まとめ】セクション(見出し+箇条書き3-5点)を含める。`,
          });
        }

        // Estimate total tokens and warn if approaching limit
        let estimatedInputTokens = 0;
        for (const msg of messages) {
          estimatedInputTokens += estimateTokens(String(msg.content));
        }

        if (estimatedInputTokens > AI_CONFIG.MAX_REQ_TOKENS) {
          console.warn(`Request approaching token limit: ${estimatedInputTokens}/${AI_CONFIG.MAX_REQ_TOKENS}`);
        }

        // Call OpenAI API with optimized parameters
        const completion = await openai.chat.completions.create({
          model: AI_CONFIG.MODEL,
          messages,
          temperature: AI_CONFIG.TEMPERATURE,
          max_tokens: AI_CONFIG.MAX_OUTPUT_TOKENS,
        });

        assistantResponse = completion.choices[0]?.message?.content || "応答がありませんでした";
        usage = completion.usage;

        // Record token usage
        if (usage && req.userId) {
          await recordTokenUsage(
            req.userId,
            spotId,
            usage.prompt_tokens,
            usage.completion_tokens
          );
        }

        // Cache response
        responseCache.set(spotId, userText, assistantResponse);
      }

      // Save assistant turn
      const assistantTurn = await prisma.turn.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: assistantResponse,
        },
      });

      // If this was the final turn, update spot notes with summary
      const isFinalTurn = currentPairs + 1 === MAX_TURNS;
      if (isFinalTurn) {
        const summaryMatch = assistantResponse.match(/【会話まとめ】([\s\S]*)/);
        let summary = summaryMatch ? summaryMatch[1].trim() : null;

        // Fallback: if no summary marker, extract last paragraph as summary
        if (!summary) {
          const paragraphs = assistantResponse.split("\n\n").filter((p) => p.trim());
          if (paragraphs.length > 0) {
            summary = `【会話まとめ】\n${paragraphs[paragraphs.length - 1]}`;
          } else {
            summary = `【会話まとめ】\n${assistantResponse}`;
          }
        }

        const currentNotes = spot.notes || "";
        const updatedNotes = currentNotes ? `${currentNotes}\n\n${summary}` : summary;

        await prisma.spot.update({
          where: { id: spot.id },
          data: { notes: updatedNotes },
        });
      }

      const newPairs = currentPairs + 1;
      const remaining = MAX_TURNS - newPairs;

      res.json({
        userTurn: {
          id: userTurn.id,
          role: userTurn.role,
          content: userTurn.content,
          createdAt: userTurn.createdAt,
        },
        assistantTurn: {
          id: assistantTurn.id,
          role: assistantTurn.role,
          content: assistantTurn.content,
          createdAt: assistantTurn.createdAt,
        },
        pairs: newPairs,
        remaining,
        completed: remaining === 0,
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        } : undefined,
      });
    } catch (error: any) {
      console.error("AI chat error:", error);
      
      // Handle OpenAI-specific errors
      if (error?.status === 429) {
        res.status(429).json({
          code: "OPENAI_RATE_LIMIT",
          message: "OpenAI APIのレート制限に達しました。しばらく待ってから再試行してください",
        });
        return;
      }

      res.status(500).json({
        code: "SERVER_ERROR",
        message: "AI応答の取得に失敗しました",
      });
    }
  }
);

export default router;
