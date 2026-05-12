import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// ─── 質問定義 ────────────────────────────────────────────────
export const QUIZ_QUESTIONS = [
  {
    key: "quizStyle",
    multi: false,
    title: "旅の基本スタイルは？",
    options: [
      { value: "backpacker", label: "バックパッカー", emoji: "🎒" },
      { value: "luxury", label: "贅沢・ラグジュアリー", emoji: "✨" },
      { value: "balanced", label: "バランス重視", emoji: "⚖️" },
      { value: "blitz", label: "弾丸旅行", emoji: "⚡" },
    ],
  },
  {
    key: "quizExperiences",
    multi: true,
    title: "どんな体験を重視する？（複数選択可）",
    options: [
      { value: "history", label: "歴史・文化", emoji: "🏛️" },
      { value: "nature", label: "自然・絶景", emoji: "🏔️" },
      { value: "food", label: "グルメ・食文化", emoji: "🍜" },
      { value: "art", label: "アート・デザイン", emoji: "🎨" },
      { value: "nightlife", label: "ナイトライフ", emoji: "🌙" },
      { value: "shopping", label: "ショッピング", emoji: "🛍️" },
    ],
  },
  {
    key: "quizPace",
    multi: false,
    title: "旅のテンポは？",
    options: [
      { value: "slow", label: "のんびり（1日1〜2箇所）", emoji: "🐢" },
      { value: "active", label: "アクティブ（予定を詰め込む）", emoji: "🏃" },
      { value: "mood", label: "その時の気分で", emoji: "🌊" },
    ],
  },
  {
    key: "quizAccommodations",
    multi: true,
    title: "好みの宿泊先は？（複数選択可）",
    options: [
      { value: "hostel", label: "ゲストハウス", emoji: "🏠" },
      { value: "design_hotel", label: "デザインホテル", emoji: "🏨" },
      { value: "airbnb", label: "現地アパート (Airbnb等)", emoji: "🏡" },
      { value: "five_star", label: "5つ星ホテル", emoji: "⭐" },
      { value: "ryokan", label: "老舗旅館", emoji: "🎎" },
    ],
  },
  {
    key: "quizFood",
    multi: true,
    title: "食事へのこだわりは？（複数選択可）",
    options: [
      { value: "street", label: "ローカル屋台", emoji: "🌮" },
      { value: "hidden", label: "隠れた名店", emoji: "🔍" },
      { value: "instagram", label: "SNS映えスポット", emoji: "📸" },
      { value: "michelin", label: "ミシュラン・高級店", emoji: "👨‍🍳" },
      { value: "cafe", label: "カフェ巡り", emoji: "☕" },
    ],
  },
  {
    key: "quizTransport",
    multi: true,
    title: "移動手段の好みは？（複数選択可）",
    options: [
      { value: "public", label: "公共交通機関", emoji: "🚇" },
      { value: "walking", label: "徒歩", emoji: "🚶" },
      { value: "taxi", label: "タクシー・配車アプリ", emoji: "🚕" },
      { value: "rental", label: "レンタカー", emoji: "🚗" },
      { value: "bicycle", label: "自転車", emoji: "🚲" },
    ],
  },
  {
    key: "quizBudget",
    multi: false,
    title: "1日あたりの予算感は？",
    options: [
      { value: "budget", label: "節約 (Low)", emoji: "💰" },
      { value: "moderate", label: "標準 (Middle)", emoji: "💵" },
      { value: "high", label: "余裕あり (High)", emoji: "💎" },
    ],
  },
  {
    key: "quizCompanions",
    multi: true,
    title: "誰と行くことが多い？（複数選択可）",
    options: [
      { value: "solo", label: "一人旅", emoji: "🧳" },
      { value: "friends", label: "友人", emoji: "👫" },
      { value: "couple", label: "カップル・夫婦", emoji: "❤️" },
      { value: "family", label: "家族（子連れ）", emoji: "👨‍👩‍👧" },
      { value: "workcation", label: "出張・ワーケーション", emoji: "💻" },
    ],
  },
  {
    key: "quizAttractionStyle",
    multi: false,
    title: "観光地の好みは？",
    options: [
      { value: "popular", label: "王道の観光スポット派", emoji: "📍" },
      { value: "hidden", label: "知る人ぞ知る穴場派", emoji: "🗺️" },
    ],
  },
  {
    key: "quizRegions",
    multi: true,
    title: "特に関心があるエリアは？（複数選択可）",
    options: [
      { value: "europe", label: "ヨーロッパ", emoji: "🇪🇺" },
      { value: "asia", label: "アジア", emoji: "🌏" },
      { value: "africa", label: "アフリカ", emoji: "🌍" },
      { value: "north_america", label: "北米", emoji: "🗽" },
      { value: "latin_america", label: "中南米", emoji: "🌎" },
      { value: "oceania", label: "オセアニア", emoji: "🦘" },
    ],
  },
] as const;

type Answers = Record<string, string | string[]>;

interface Props {
  initialAnswers?: Answers;
  onComplete: (answers: Answers) => Promise<void>;
  onSkip?: () => void;
  title?: string;
}

export function TravelProfileQuiz({ initialAnswers, onComplete, onSkip, title }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const q = QUIZ_QUESTIONS[step];
  const total = QUIZ_QUESTIONS.length;
  const current = answers[q.key];

  const isSelected = (v: string) => {
    if (q.multi) return Array.isArray(current) && current.includes(v);
    return current === v;
  };

  const toggle = (v: string) => {
    if (q.multi) {
      const arr = Array.isArray(current) ? [...current] : [];
      setAnswers((a) => ({
        ...a,
        [q.key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v],
      }));
    } else {
      setAnswers((a) => ({ ...a, [q.key]: v }));
    }
  };

  const canNext = q.multi
    ? Array.isArray(current) && current.length > 0
    : !!current;

  const handleNext = async () => {
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      setSaving(true);
      try {
        await onComplete(answers);
      } catch {
        toast({ title: "保存に失敗しました", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white px-4 pt-6 pb-24">
      {/* ヘッダー */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-1">{title ?? "旅のプロファイル設定"}</p>
        <div className="flex gap-1 mb-3">
          {QUIZ_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-[#3C237D]" : "bg-gray-200"}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-right">{step + 1} / {total}</p>
      </div>

      {/* 質問 */}
      <h2 className="text-lg font-bold text-gray-900 mb-5">{q.title}</h2>

      {/* 選択肢カード */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {q.options.map((opt) => {
          const sel = isSelected(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all text-center ${
                sel
                  ? "border-[#3C237D] bg-[#3C237D]/5"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              {sel && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#3C237D] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <span className="text-2xl">{opt.emoji}</span>
              <span className={`text-sm font-medium leading-tight ${sel ? "text-[#3C237D]" : "text-gray-700"}`}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ナビゲーション */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] p-4 bg-white border-t space-y-2">
        <Button
          onClick={handleNext}
          disabled={!canNext || saving}
          className="w-full h-12 bg-[#3C237D] hover:bg-[#2E1A64] gap-2"
        >
          {saving ? "保存中..." : step < total - 1 ? (
            <>次へ <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>完了 <Check className="w-4 h-4" /></>
          )}
        </Button>
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} className="flex-1 gap-1">
              <ChevronLeft className="w-4 h-4" />戻る
            </Button>
          )}
          {onSkip && (
            <Button variant="ghost" onClick={onSkip} className="flex-1 text-muted-foreground text-sm">
              {step < total - 1 ? "スキップ" : "後で設定する"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
