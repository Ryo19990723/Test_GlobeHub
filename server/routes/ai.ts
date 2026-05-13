import { Router } from "express";
import multer from "multer";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { authMiddleware, requireAuth, AuthRequest } from "../middleware/auth";
import { budgetGuard, recordTokenUsage } from "../middleware/budgetGuard";
import { aiChatRateLimiter, aiTravelChatLimiter, aiFormatLimiter, aiPlanLimiter } from "../middleware/rateLimit";
import { prisma } from "../db";
import { AI_CONFIG, CLAUDE_CONFIG, TAVILY_CONFIG } from "../lib/config";
import { truncateToTokens, compressHistory } from "../lib/tokenUtils";
import { responseCache } from "../lib/responseCache";

const claude = new Anthropic({ apiKey: CLAUDE_CONFIG.API_KEY });

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-placeholder",
});

// multer for audio uploads (Whisper transcription)
const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // Whisper limit: 25MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["audio/webm", "audio/ogg", "audio/wav", "audio/mp4", "audio/mpeg", "audio/mp3"];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(webm|ogg|wav|mp4|mp3|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported audio format"));
    }
  },
});

const MAX_TURNS = 3;

// POST /ai/transcribe - Voice to text using OpenAI Whisper
router.post(
  "/transcribe",
  authMiddleware,
  requireAuth,
  uploadAudio.single("audio"),
  async (req: AuthRequest, res) => {
    try {
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "音声ファイルが必要です" });
        return;
      }

      // Send audio buffer to Whisper API (Uint8Array で Buffer 型の互換問題を回避)
      const audioBlob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || "audio/webm" });
      const audioFile = new File([audioBlob], "audio.webm", { type: file.mimetype || "audio/webm" });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "ja",
      });

      res.json({ text: transcription.text });
    } catch (error: any) {
      console.error("Transcribe error:", error);
      if (error?.status === 429) {
        res.status(429).json({ code: "RATE_LIMIT", message: "しばらく待ってから再試行してください" });
        return;
      }
      res.status(500).json({ code: "SERVER_ERROR", message: "音声の変換に失敗しました" });
    }
  }
);

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
      let claudeUsage: { input_tokens: number; output_tokens: number } | undefined;

      if (cachedResponse) {
        assistantResponse = cachedResponse;
      } else {
        const isFinalTurn = currentPairs + 1 === MAX_TURNS;

        const systemPrompt = `旅の聞き出しAI。スポット:${spot.name || "不明"} 目的:${spot.trip.purpose || "不明"}。
各ターンは具体例を引き出す1-2問+末尾に《要約:…》1行。${AI_CONFIG.MAX_OUTPUT_TOKENS}token以内。
${isFinalTurn ? "3ターン目:見出し+箇条書き3-5点でまとめ、末尾に【会話まとめ】セクション。" : `${currentPairs + 1}/${MAX_TURNS}ターン目。`}冗長・一般論は避ける。`;

        // 圧縮済み履歴をユーザーターンの前に添付
        const historyCompressed = conversation.turns.length > 0
          ? compressHistory(conversation.turns) : null;

        const claudeMessages: Anthropic.MessageParam[] = [];
        if (historyCompressed) {
          claudeMessages.push({ role: "user", content: `前の会話の要点:\n${historyCompressed}` });
          claudeMessages.push({ role: "assistant", content: "承知しました。" });
        }
        claudeMessages.push({ role: "user", content: userText });

        const response = await claude.messages.create({
          model: CLAUDE_CONFIG.MODEL_LIGHT,
          max_tokens: AI_CONFIG.MAX_OUTPUT_TOKENS,
          system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
          messages: claudeMessages,
        });

        assistantResponse = response.content[0].type === "text"
          ? response.content[0].text : "応答がありませんでした";

        claudeUsage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens };

        if (req.userId) {
          await recordTokenUsage(req.userId, spotId, response.usage.input_tokens, response.usage.output_tokens);
        }

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
        usage: claudeUsage ? {
          promptTokens: claudeUsage.input_tokens,
          completionTokens: claudeUsage.output_tokens,
          totalTokens: claudeUsage.input_tokens + claudeUsage.output_tokens,
        } : undefined,
      });
    } catch (error: any) {
      console.error("AI chat error:", error);
      
      if (error?.status === 429) {
        res.status(429).json({
          code: "RATE_LIMIT",
          message: "AIのレート制限に達しました。しばらく待ってから再試行してください",
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

// ─── STEP 4: AI自動整形 ───────────────────────────────────────
// POST /ai/format-spot  — raw notes → readable spot description
router.post("/format-spot", authMiddleware, requireAuth, budgetGuard, aiFormatLimiter, async (req: AuthRequest, res) => {
  try {
    const { notes, spotName, address } = req.body as {
      notes: string;
      spotName?: string;
      address?: string;
    };

    if (!notes?.trim()) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "メモが必要です" });
      return;
    }

    // Haiku: 軽量タスクなのでコスト最小化
    const sys = "旅のスポット紹介文ライター。メモを150〜250字の敬体紹介文に変換。絵文字・記号なし。紹介文のみ返す。";
    const userContent = [
      spotName ? `名前:${spotName}` : null,
      address ? `場所:${address}` : null,
      `メモ:${notes.trim().slice(0, 300)}`,
    ].filter(Boolean).join(" ");

    const response = await claude.messages.create({
      model: CLAUDE_CONFIG.MODEL_LIGHT,
      max_tokens: 350,
      system: sys,
      messages: [{ role: "user", content: userContent }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    res.json({ formatted: text });
  } catch (error: any) {
    console.error("format-spot error:", error);
    res.status(500).json({ code: "SERVER_ERROR", message: "AI整形に失敗しました" });
  }
});

// ─── STEP 5a: スポット推薦（カテゴリ別カード選択）────────────
// POST /ai/spot-recommendations
// Returns: { categories: [{ name, spots: [{ id, name, summary, category, mustSee }] }] }
router.post("/spot-recommendations", authMiddleware, budgetGuard, aiPlanLimiter, async (req: AuthRequest, res) => {
  try {
    // APIキー未設定チェック（ログより先に返す）
    if (!CLAUDE_CONFIG.API_KEY) {
      res.status(503).json({ code: "SERVICE_UNAVAILABLE", message: "AI機能が現在利用できません（サーバー設定をご確認ください）" });
      return;
    }

    const { destination, month, days, tripStyle, companions, interests } = req.body as {
      destination: string;
      month: string;
      days?: number;
      tripStyle?: string;
      companions?: string;
      interests?: string[];
    };

    if (!destination?.trim()) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "行き先が必要です" });
      return;
    }

    // ユーザーのクイズ回答を取得（未ログインの場合はnull）
    const profile = req.userId
      ? await prisma.userTravelProfile.findUnique({
          where: { userId: req.userId },
          select: {
            quizExperiences: true,
            quizAttractionStyle: true,
            quizRegions: true,
            scoreFood: true,
            scoreHistory: true,
            scoreNature: true,
            scoreArchitecture: true,
            scoreArt: true,
          },
        })
      : null;

    // Tavily でスポット情報を収集（トークン節約のため150文字でカット）
    let webSnippets = "";
    if (TAVILY_CONFIG.API_KEY) {
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: TAVILY_CONFIG.API_KEY,
            query: `${destination} 観光スポット おすすめ ${month} 人気`,
            max_results: 5,
            search_depth: "basic",
          }),
        });
        if (tavilyRes.ok) {
          const d = await tavilyRes.json() as { results: Array<{ title: string; content: string }> };
          webSnippets = d.results.map((r) => `${r.title}: ${r.content?.slice(0, 120)}`).join("\n");
        }
      } catch { /* ignore */ }
    }

    const prefSummary = profile
      ? [
          profile.quizExperiences ? `好み:${profile.quizExperiences}` : "",
          profile.quizAttractionStyle ? `観光スタイル:${profile.quizAttractionStyle}` : "",
          `スコア(食${profile.scoreFood}/歴${profile.scoreHistory}/自然${profile.scoreNature}/建築${profile.scoreArchitecture}/アート${profile.scoreArt})`,
        ].filter(Boolean).join(" ")
      : "";

    // スポット推薦: 豊富な情報付きでJSON生成
    const sys = `旅スポット推薦AI。純粋なJSONのみ返す。マークダウン・説明文不要。
フォーマット厳守:
{"categories":[{"name":"カテゴリ名","spots":[{
  "id":"s1",
  "name":"スポット名",
  "summary":"概要を40字以内で",
  "highlights":["見どころ①30字以内","見どころ②30字以内","見どころ③30字以内"],
  "duration":"所要時間（例:1〜2時間）",
  "fee":"料金（例:無料 / 有料 約1500円）",
  "tip":"訪問のコツを40字以内で",
  "mustSee":true
}]}]}
ルール: カテゴリ最大4つ・各3件・合計10件以内。全フィールド必須。JSONを必ず閉じる。`;

    const userMsg = [
      `行き先:${destination} 時期:${month}${days ? ` 期間:${days}日間` : ""}`,
      tripStyle ? `スタイル:${tripStyle}` : "",
      companions ? `同行者:${companions}` : "",
      interests?.length ? `興味:${interests.join(",")}` : "",
      prefSummary,
      webSnippets ? `参考情報:\n${webSnippets.slice(0, 400)}` : "",
    ].filter(Boolean).join("\n");

    const response = await claude.messages.create({
      model: CLAUDE_CONFIG.MODEL_LIGHT,
      max_tokens: 4500,
      system: sys,
      messages: [{ role: "user", content: userMsg }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";

    // 堅牢なJSONパース: 複数のパターンを試みる
    let parsed: { categories: { name: string; spots: unknown[] }[] } = { categories: [] };
    const tryParse = (str: string) => {
      try { return JSON.parse(str); } catch { return null; }
    };
    // 1. そのままパース
    parsed = tryParse(raw)
      // 2. ```json ... ``` コードブロック内を抽出
      ?? tryParse(raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() ?? "")
      // 3. 最初の { から最後の } までを抽出
      ?? tryParse(raw.match(/(\{[\s\S]*\})/)?.[1] ?? "")
      // 4. すべて失敗したら空を返す
      ?? { categories: [] };

    res.json({ ...parsed, webSearched: !!webSnippets });
  } catch (error: any) {
    console.error("spot-recommendations error:", error?.message ?? error);
    const isDev = process.env.NODE_ENV !== "production";
    res.status(500).json({
      code: "SERVER_ERROR",
      message: isDev ? `スポット推薦の生成に失敗しました: ${error?.message}` : "スポット推薦の生成に失敗しました",
    });
  }
});

// ─── STEP 5b: 旅行計画（plan-trip は廃止 → spot-recommendations に統合）────
// POST /ai/plan-trip  — destination + prefs → personalized itinerary
router.post("/plan-trip", authMiddleware, requireAuth, async (req: AuthRequest, res) => {
  try {
    const { destination, days, budget, month, notes } = req.body as {
      destination: string;
      days: number;
      budget: "budget" | "moderate" | "luxury";
      month: string;
      notes?: string;
    };

    if (!destination?.trim() || !days || !month) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "行き先・期間・時期が必要です" });
      return;
    }

    // 1. ユーザーの旅の個性を取得
    const [profile, recentTrips] = await Promise.all([
      prisma.userTravelProfile.findUnique({ where: { userId: req.userId! } }),
      prisma.trip.findMany({
        where: { authorId: req.userId!, status: "PUBLISHED" },
        include: { spots: { include: { tags: true } } },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),
    ]);

    // 2. Tavily で目的地の最新情報を検索
    let webContext = "";
    if (TAVILY_CONFIG.API_KEY) {
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: TAVILY_CONFIG.API_KEY,
            query: `${destination} 旅行 観光スポット おすすめ ${month}`,
            max_results: TAVILY_CONFIG.MAX_RESULTS,
            search_depth: "basic",
          }),
        });
        if (tavilyRes.ok) {
          const tavilyData = await tavilyRes.json() as { results: Array<{ title: string; content: string }> };
          webContext = tavilyData.results
            .map((r) => `・${r.title}: ${r.content?.slice(0, 150)}`)
            .join("\n");
        }
      } catch {
        // Web検索失敗は無視してClaude単体で回答
      }
    }

    // 3. ユーザープロファイルのサマリー生成
    const budgetLabel = { budget: "節約志向", moderate: "標準", luxury: "高め" }[budget] ?? "標準";
    const profileSummary = profile
      ? `好みカテゴリ: 食${profile.scoreFood}/自然${profile.scoreNature}/歴史${profile.scoreHistory}/建築${profile.scoreArchitecture}/アート${profile.scoreArt}（各100点満点）`
      : "プロファイルなし（一般的な旅行者として提案）";
    const pastCountries = Array.from(new Set(recentTrips.map((t) => t.country).filter(Boolean) as string[])).join("・") || "なし";

    const systemPrompt = `あなたは旅行プランナーAI「GlobeHub」です。
ユーザーの過去の旅行記録と好みをもとに、パーソナライズされた旅行プランを提案します。

提案フォーマット:
- 各日程: 「Day X: エリア名（理由）」＋スポット2〜3件
- 末尾に「このプランのポイント」を2〜3行で
- 敬体（です・ます調）、読みやすく簡潔に`;

    const userContent = `行き先: ${destination}
期間: ${days}日間
時期: ${month}
予算感: ${budgetLabel}
${notes ? `リクエスト: ${notes}` : ""}

【ユーザーの旅の個性】
${profileSummary}
過去に訪れた国: ${pastCountries}

【Web検索で得た最新情報】
${webContext || "なし"}`;

    const response = await claude.messages.create({
      model: CLAUDE_CONFIG.MODEL,
      max_tokens: 1200,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    });

    const plan = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    res.json({ plan, webSearched: !!webContext });
  } catch (error: any) {
    console.error("plan-trip error:", error);
    res.status(500).json({ code: "SERVER_ERROR", message: "旅行計画の生成に失敗しました" });
  }
});

// ─── STEP 7: グローバル旅行AIチャット ────────────────────────
// POST /ai/travel-chat
// body: { messages: [{role, content}][], useWeb?: boolean }
router.post("/travel-chat", authMiddleware, requireAuth, budgetGuard, aiTravelChatLimiter, async (req: AuthRequest, res) => {
  try {
    const { messages, useWeb } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      useWeb?: boolean;
    };

    if (!messages?.length) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "メッセージが必要です" });
      return;
    }

    // 最新6メッセージだけ使用（トークン節約）
    const history = messages.slice(-6);
    const latestUserMsg = history.filter((m) => m.role === "user").pop()?.content ?? "";

    // ユーザープロファイル + 直近旅記録を並列取得
    const [profile, recentTrips] = await Promise.all([
      prisma.userTravelProfile.findUnique({
        where: { userId: req.userId! },
        select: {
          scoreFood: true, scoreNature: true, scoreHistory: true,
          scoreArchitecture: true, scoreArt: true,
          quizStyle: true, quizPace: true, quizBudget: true,
          personalityText: true,
        },
      }),
      prisma.trip.findMany({
        where: { authorId: req.userId! },
        select: { country: true, city: true, title: true },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),
    ]);

    // Tavily 検索（useWeb=true or 地名・旅行語が含まれる場合）
    const needsWeb = useWeb ||
      /[A-Za-zÀ-ÿ぀-鿿]{3,}|行き|おすすめ|観光|ホテル|食事|ビザ/.test(latestUserMsg);
    let webSnippet = "";
    if (needsWeb && TAVILY_CONFIG.API_KEY && latestUserMsg.length > 5) {
      try {
        const tRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: TAVILY_CONFIG.API_KEY,
            query: latestUserMsg.slice(0, 100),
            max_results: 3,
            search_depth: "basic",
          }),
        });
        if (tRes.ok) {
          const td = await tRes.json() as { results: Array<{ title: string; content: string }> };
          webSnippet = td.results.map((r) => `・${r.title}: ${r.content?.slice(0, 100)}`).join("\n");
        }
      } catch { /* ignore */ }
    }

    // プロファイルサマリー（短縮）
    const profileLine = profile
      ? [
          profile.personalityText ?? null,
          `好み:食${profile.scoreFood}/自然${profile.scoreNature}/歴史${profile.scoreHistory}/建築${profile.scoreArchitecture}`,
          profile.quizStyle ? `スタイル:${profile.quizStyle}` : null,
          profile.quizBudget ? `予算:${profile.quizBudget}` : null,
        ].filter(Boolean).join(" ")
      : "プロファイル未設定";

    const visitedPlaces = Array.from(
      new Set(recentTrips.map((t) => t.city ?? t.country).filter(Boolean) as string[])
    ).slice(0, 6).join("・") || "なし";

    const systemPrompt = `あなたはGlobeHubのAI旅行アシスタント。ユーザーの旅の好みと経験をもとに、具体的で役立つ旅行アドバイスを提供する。
ユーザー情報: ${profileLine}
訪問済みの都市・国: ${visitedPlaces}
${webSnippet ? `最新Web情報:\n${webSnippet}` : ""}
ルール: 150〜300字で簡潔に回答。敬体。絵文字は1〜2個まで。`;

    const response = await claude.messages.create({
      model: CLAUDE_CONFIG.MODEL,
      max_tokens: 500,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: history,
    });

    const reply = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    res.json({ reply, webSearched: !!webSnippet });
  } catch (error: any) {
    console.error("travel-chat error:", error);
    res.status(500).json({ code: "SERVER_ERROR", message: "AIの応答に失敗しました" });
  }
});

export default router;
