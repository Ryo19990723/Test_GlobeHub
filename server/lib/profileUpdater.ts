import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../db";
import { CLAUDE_CONFIG } from "./config";

const claude = new Anthropic({ apiKey: CLAUDE_CONFIG.API_KEY });

const TAG_LIST = ["食", "自然", "歴史", "都市", "アート", "建築", "ショッピング", "アクティビティ", "ビーチ", "温泉"] as const;
type Tag = typeof TAG_LIST[number];

const TAG_TO_SCORE_FIELD: Record<Tag, keyof ScoreFields> = {
  食:           "scoreFood",
  自然:         "scoreNature",
  歴史:         "scoreHistory",
  都市:         "scoreUrban",
  アート:       "scoreArt",
  建築:         "scoreArchitecture",
  ショッピング: "scoreShopping",
  アクティビティ: "scoreActivity",
  ビーチ:       "scoreBeach",
  温泉:         "scoreOnsen",
};

interface ScoreFields {
  scoreFood: number;
  scoreNature: number;
  scoreHistory: number;
  scoreUrban: number;
  scoreArt: number;
  scoreArchitecture: number;
  scoreShopping: number;
  scoreActivity: number;
  scoreBeach: number;
  scoreOnsen: number;
}

/** Haikuでメモからタグを検出（fire-and-forget用）*/
async function detectTagsFromText(text: string): Promise<Tag[]> {
  if (!text?.trim() || !CLAUDE_CONFIG.API_KEY) return [];
  try {
    const resp = await claude.messages.create({
      model: CLAUDE_CONFIG.MODEL_LIGHT,
      max_tokens: 60,
      system: `スポットメモから当てはまるタグをJSON配列で返す。タグ候補:${TAG_LIST.join(",")}。例:["食","都市"]。当てはまらなければ[]。`,
      messages: [{ role: "user", content: text.slice(0, 200) }],
    });
    const raw = resp.content[0].type === "text" ? resp.content[0].text.trim() : "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed: string[] = JSON.parse(match[0]);
    return parsed.filter((t): t is Tag => TAG_LIST.includes(t as Tag));
  } catch {
    return [];
  }
}

/** スポットのタグをDBに保存し、ユーザープロファイルスコアを再計算 */
export async function updateSpotTagsAndProfile(
  spotId: string,
  userId: string,
  noteText: string,
): Promise<void> {
  const tags = await detectTagsFromText(noteText);
  if (tags.length === 0) return;

  // 既存 AI タグを削除して上書き
  await prisma.spotTag.deleteMany({ where: { spotId, source: "ai" } });
  for (const tag of tags) {
    await prisma.spotTag.upsert({
      where: { spotId_tag: { spotId, tag } },
      create: { spotId, tag, source: "ai" },
      update: { source: "ai" },
    });
  }

  // ユーザー全スポットのタグを集計してスコア再計算
  await recalcProfileScores(userId);
}

/** クイズ回答からpersonalityTextを生成してプロファイルに保存 */
export async function generatePersonalityText(userId: string): Promise<void> {
  if (!CLAUDE_CONFIG.API_KEY) return;
  try {
    const profile = await prisma.userTravelProfile.findUnique({
      where: { userId },
      select: {
        scoreFood: true, scoreNature: true, scoreHistory: true,
        scoreArchitecture: true, scoreArt: true, scoreShopping: true,
        scoreActivity: true, scoreBeach: true,
        quizStyle: true, quizPace: true, quizBudget: true,
        quizCompanions: true, quizAttractionStyle: true,
      },
    });
    if (!profile) return;

    const scores = [
      { tag: "食", s: profile.scoreFood },
      { tag: "自然", s: profile.scoreNature },
      { tag: "歴史", s: profile.scoreHistory },
      { tag: "建築", s: profile.scoreArchitecture },
      { tag: "アート", s: profile.scoreArt },
      { tag: "ショッピング", s: profile.scoreShopping },
      { tag: "アクティビティ", s: profile.scoreActivity },
      { tag: "ビーチ", s: profile.scoreBeach },
    ].sort((a, b) => b.s - a.s).slice(0, 3).filter((x) => x.s > 0).map((x) => x.tag).join("・");

    const styleMap: Record<string, string> = {
      backpacker: "バックパッカースタイル", luxury: "ラグジュアリー志向",
      balanced: "バランス重視", blitz: "弾丸旅行派",
    };
    const paceMap: Record<string, string> = {
      slow: "ゆっくりペース", active: "アクティブ派", mood: "気分重視",
    };

    const input = [
      scores ? `好みカテゴリ:${scores}` : "",
      profile.quizStyle ? `スタイル:${styleMap[profile.quizStyle] ?? profile.quizStyle}` : "",
      profile.quizPace ? `ペース:${paceMap[profile.quizPace] ?? profile.quizPace}` : "",
    ].filter(Boolean).join(" ");

    if (!input) return;

    const resp = await claude.messages.create({
      model: CLAUDE_CONFIG.MODEL_LIGHT,
      max_tokens: 60,
      system: "旅人の個性を25文字以内の一言で表現。例:「建築と食文化を愛する、のんびり派の旅人」。テキストのみ返す。",
      messages: [{ role: "user", content: input }],
    });
    const text = resp.content[0].type === "text" ? resp.content[0].text.trim().replace(/^「|」$/g, "") : null;
    if (text) {
      await prisma.userTravelProfile.update({ where: { userId }, data: { personalityText: text } });
    }
  } catch { /* ignore */ }
}

/** 全SpotTagを集計してUserTravelProfileのスコアを更新 */
export async function recalcProfileScores(userId: string): Promise<void> {
  const tagRows = await prisma.spotTag.findMany({
    where: {
      spot: { trip: { authorId: userId } },
    },
    select: { tag: true },
  });

  const counts: Record<string, number> = {};
  for (const { tag } of tagRows) {
    counts[tag] = (counts[tag] ?? 0) + 1;
  }

  const maxCount = Math.max(1, ...Object.values(counts));

  const scoreData: Partial<ScoreFields> = {};
  for (const [tag, field] of Object.entries(TAG_TO_SCORE_FIELD) as [Tag, keyof ScoreFields][]) {
    scoreData[field] = Math.round(((counts[tag] ?? 0) / maxCount) * 100);
  }

  await prisma.userTravelProfile.upsert({
    where: { userId },
    create: { userId, ...(scoreData as ScoreFields) },
    update: scoreData,
  });

  // スコア更新のたびに personality text を再生成（非同期、エラーは無視）
  generatePersonalityText(userId).catch(() => {});
}
