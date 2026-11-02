import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_CONFIG } from "./config";
import { LIGHT_PARAMS, textOf } from "./claude";

// Stored in Trip.journalText as JSON.
export interface Journal {
  title: string;
  sections: { heading: string; entries: { spotId: string; text: string }[] }[];
  /** 旅のメモ, only from what the traveler said about the whole trip (may be empty). */
  memo?: { label: MemoLabel; text: string }[];
}

export const MEMO_LABELS = ["誰と", "日程", "予算", "移動", "旅のコツ", "ひとこと"] as const;
export type MemoLabel = (typeof MEMO_LABELS)[number];

export interface JournalSpot {
  id: string;
  capturedAt: Date | null;
  createdAt: Date;
  name: string | null;
  placeName: string | null;
  address: string | null;
  impressionRemarks: string | null;
  notes: string | null;
  hasPhoto: boolean;
}

const JOURNAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "sections", "memo"],
  properties: {
    title: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "entries"],
        properties: {
          heading: { type: "string" },
          entries: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["spotId", "text"],
              properties: { spotId: { type: "string" }, text: { type: "string" } },
            },
          },
        },
      },
    },
    memo: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "text"],
        properties: { label: { type: "string", enum: [...MEMO_LABELS] }, text: { type: "string" } },
      },
    },
  },
};

const SYSTEM = `あなたは旅行記の編集者。旅人が旅の途中に残した短い記録（時刻・場所・ひとこと）を、読み返したくなる日記調の旅行記にまとめる。

厳守:
- 旅人本人が書いた日記として書く。「記録によると」「〜と書かれている」「場所は不明」など、記録やデータについての説明は一切書かない
- 記録に書かれていない事実（料理名・天気・人物・感情・出来事・地名）を作らない。意味の読み取れない文字は使わない
- ひとことを読みやすく言い換えるだけにとどめ、行動（歩いた・眺めた等）や気持ち（見とれた・感動した等）を付け足さない
- 時刻は必要なときだけ「朝」「昼過ぎ」「夕方」のように自然に表す
- ひとことが「（なし）」の記録は、場所だけを使った短い一文にする。場所も未確認なら空文字にする
- 1記録あたり1〜3文。常体（〜だ・〜だった）。絵文字・見出し記号なし
- 記録の順番を変えない。spotId は入力のものをそのまま使い、全記録を1回ずつ含める
- 日付が変わるごとに section を分け、heading は「1日目 11月1日」の形式
- title は旅全体を表す20字以内（例:「坂の街リスボン、路面電車と夕暮れ」）
- memo は「旅全体のひとこと」だけから作る。書かれている内容を label（誰と・日程・予算・移動・旅のコツ・ひとこと）に振り分け、各 text は短い一文（旅のコツは「・」区切りで複数可）。書かれていない label は含めない。「旅全体のひとこと」が「（なし）」なら memo は空配列
- 「旅全体のひとこと」の感想は、最後の記録の文章に混ぜず memo の「ひとこと」に入れる`;

function formatTime(d: Date, timeZone: string) {
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("ja-JP", { timeZone, ...o }).format(d);
  return { date: fmt({ year: "numeric", month: "numeric", day: "numeric" }), time: fmt({ hour: "2-digit", minute: "2-digit" }) };
}

export function buildJournalInput(
  trip: { title: string; city: string | null; overview?: string | null },
  spots: JournalSpot[],
  timeZone: string,
) {
  const lines = spots.map((s) => {
    const { date, time } = formatTime(s.capturedAt ?? s.createdAt, timeZone);
    const place = s.placeName || s.name || "（未確認）";
    const words = (s.impressionRemarks || s.notes || "").trim().slice(0, 500) || "（なし）";
    return `- spotId:${s.id} | ${date} ${time} | 場所:${place} | ひとこと:${words}${s.hasPhoto ? " | 写真あり" : ""}`;
  });
  const overview = trip.overview?.trim().slice(0, 2000) || "（なし）";
  return `旅のタイトル（仮）:${trip.title}\n都市:${trip.city || "不明"}\n旅全体のひとこと:${overview}\n\n記録:\n${lines.join("\n")}`;
}

export async function generateJournal(claude: Anthropic, input: string, spotIds: string[]) {
  const response = await claude.messages.create({
    model: CLAUDE_CONFIG.MODEL_LIGHT,
    ...LIGHT_PARAMS,
    output_config: { ...LIGHT_PARAMS.output_config, format: { type: "json_schema", schema: JOURNAL_SCHEMA } },
    max_tokens: Math.min(8000, 800 + spotIds.length * 300),
    system: SYSTEM,
    messages: [{ role: "user", content: input }],
  });

  const journal = JSON.parse(textOf(response)) as Journal;

  // Keep only known spots, then append any the model dropped so no record is lost.
  const known = new Set(spotIds);
  const seen = new Set<string>();
  for (const section of journal.sections) {
    section.entries = section.entries.filter((e) => known.has(e.spotId) && !seen.has(e.spotId) && seen.add(e.spotId));
  }
  const missing = spotIds.filter((id) => !seen.has(id));
  if (missing.length) {
    const last = journal.sections.at(-1) ?? { heading: "", entries: [] };
    if (!journal.sections.length) journal.sections.push(last);
    last.entries.push(...missing.map((spotId) => ({ spotId, text: "" })));
  }
  journal.sections = journal.sections.filter((s) => s.entries.length);
  journal.title = journal.title.trim().slice(0, 40);
  journal.memo = (journal.memo ?? []).filter((m) => MEMO_LABELS.includes(m.label) && m.text?.trim());

  return { journal, usage: response.usage };
}
