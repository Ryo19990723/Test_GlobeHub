import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, Loader2, RefreshCw, Plus, Check, Copy, Share2, CalendarDays, MapPin } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// ── 人気目的地リスト（オートコンプリート用）────────────────────
const POPULAR_DESTINATIONS = [
  // 日本
  "東京", "京都", "大阪", "沖縄", "北海道", "奈良", "鎌倉", "箱根", "軽井沢", "金沢",
  "福岡", "長崎", "広島", "仙台", "札幌", "那覇",
  // 東アジア
  "ソウル", "釜山", "台北", "台南", "香港", "マカオ", "上海", "北京", "成都", "西安",
  // 東南アジア
  "バンコク", "チェンマイ", "プーケット", "シンガポール", "クアラルンプール",
  "バリ島", "ジャカルタ", "ハノイ", "ホーチミン", "ダナン", "マニラ", "セブ",
  // 南アジア・中央アジア
  "デリー", "ムンバイ", "ジャイプール", "ネパール", "スリランカ",
  // ヨーロッパ
  "パリ", "ロンドン", "ローマ", "バルセロナ", "マドリード", "ミラノ", "フィレンツェ",
  "ヴェネツィア", "アムステルダム", "ウィーン", "プラハ", "ブダペスト", "ポルト",
  "リスボン", "アテネ", "イスタンブール", "チューリッヒ", "ジュネーブ",
  "コペンハーゲン", "ストックホルム", "ヘルシンキ", "オスロ", "ダブリン",
  "エディンバラ", "クラクフ", "ドゥブロヴニク", "サントリーニ島",
  // 中東
  "ドバイ", "アブダビ", "イスタンブール",
  // アフリカ
  "カイロ", "マラケシュ", "ケープタウン", "ザンジバル",
  // 北米
  "ニューヨーク", "ロサンゼルス", "サンフランシスコ", "シカゴ", "ラスベガス",
  "マイアミ", "ハワイ（ホノルル）", "バンクーバー", "トロント", "モントリオール",
  // 中南米
  "メキシコシティ", "カンクン", "リオデジャネイロ", "ブエノスアイレス",
  "マチュピチュ（クスコ）", "ボゴタ",
  // オセアニア
  "シドニー", "メルボルン", "ゴールドコースト", "オークランド",
];

// ── 型定義 ──────────────────────────────────────────────────
interface Spot {
  id: string;
  name: string;
  summary: string;
  mustSee: boolean;
}

interface Category {
  name: string;
  spots: Spot[];
}

// ── 同行者・テーマ選択肢 ─────────────────────────────────────
const COMPANION_OPTIONS = [
  { value: "solo",    label: "一人旅",     emoji: "🧳" },
  { value: "couple",  label: "カップル",   emoji: "❤️" },
  { value: "friends", label: "友人グループ", emoji: "👫" },
  { value: "family",  label: "家族（子連れ）", emoji: "👨‍👩‍👧" },
];

const INTEREST_OPTIONS = [
  { value: "history",      label: "歴史・文化",       emoji: "🏛️" },
  { value: "nature",       label: "自然・絶景",       emoji: "🏔️" },
  { value: "food",         label: "グルメ・食",       emoji: "🍜" },
  { value: "art",          label: "アート・デザイン", emoji: "🎨" },
  { value: "shopping",     label: "ショッピング",     emoji: "🛍️" },
  { value: "hidden",       label: "穴場・ローカル",   emoji: "🗺️" },
  { value: "architecture", label: "建築・都市",       emoji: "🏙️" },
  { value: "outdoor",      label: "アウトドア・冒険", emoji: "🏄" },
  { value: "photo",        label: "フォトジェニック", emoji: "📸" },
  { value: "temple",       label: "寺社・聖地",       emoji: "⛩️" },
  { value: "wellness",     label: "温泉・スパ",       emoji: "♨️" },
  { value: "nightlife",    label: "ナイトライフ",     emoji: "🌙" },
  { value: "music",        label: "音楽・エンタメ",   emoji: "🎵" },
  { value: "kids",         label: "子供が楽しめる",   emoji: "🎠" },
];

// ── 日付ユーティリティ ────────────────────────────────────────
function toDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function defaultDepart(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return toDateInput(d);
}

function defaultReturn(depart: string): string {
  const d = new Date(depart);
  d.setDate(d.getDate() + 6);
  return toDateInput(d);
}

function calcDays(depart: string, ret: string): number {
  return Math.max(1, Math.round((new Date(ret).getTime() - new Date(depart).getTime()) / 86400000));
}

function formatJa(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

// ── SpotCard ─────────────────────────────────────────────────
function SpotCard({ spot, selected, onToggle }: { spot: Spot; selected: boolean; onToggle: () => void }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
      selected ? "border-[#3C237D] bg-[#3C237D]/5" : "border-gray-200 bg-white"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {spot.mustSee && (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
              定番
            </span>
          )}
          <p className={`text-sm font-semibold truncate ${selected ? "text-[#3C237D]" : "text-gray-900"}`}>
            {spot.name}
          </p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{spot.summary}</p>
      </div>
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? "border-[#3C237D] bg-[#3C237D] text-white" : "border-gray-300 hover:border-[#3C237D]"
        }`}
      >
        {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-gray-400" />}
      </button>
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function TripPlanner() {
  const initDepart = defaultDepart();
  const [destination, setDestination]     = useState("");
  const [suggestions, setSuggestions]     = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [departDate, setDepartDate]       = useState(initDepart);
  const [returnDate, setReturnDate]       = useState(defaultReturn(initDepart));
  const [budget, setBudget]               = useState<"budget" | "moderate" | "high">("moderate");
  const [companion, setCompanion]         = useState("");
  const [interests, setInterests]         = useState<string[]>([]);
  const [phase, setPhase]                 = useState<"form" | "results">("form");
  const [loading, setLoading]             = useState(false);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [webSearched, setWebSearched]     = useState(false);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const suggestRef                        = useRef<HTMLDivElement>(null);
  const { toast }                         = useToast();

  // 日程の計算値
  const tripDays  = calcDays(departDate, returnDate);
  const tripMonth = new Date(departDate).toLocaleDateString("ja-JP", { month: "long" });
  const dateLabel = `${formatJa(departDate)} 〜 ${formatJa(returnDate)}（${tripDays}日間）`;

  // 出発日変更時に帰国日が出発日より前にならないよう補正
  const handleDepartChange = (val: string) => {
    setDepartDate(val);
    if (val >= returnDate) {
      const d = new Date(val);
      d.setDate(d.getDate() + 3);
      setReturnDate(toDateInput(d));
    }
  };

  // 目的地入力 → サジェスト
  const handleDestinationChange = (val: string) => {
    setDestination(val);
    if (val.length >= 1) {
      const filtered = POPULAR_DESTINATIONS.filter((d) =>
        d.includes(val) || d.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 7);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectDestination = (d: string) => {
    setDestination(d);
    setShowSuggestions(false);
  };

  // サジェスト外クリックで閉じる
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleInterest = (v: string) =>
    setInterests((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const toggleSpot = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSearch = async () => {
    if (!destination.trim()) {
      toast({ title: "行き先を入力してください", variant: "destructive" });
      return;
    }
    setLoading(true);
    setCategories([]);
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/ai/spot-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          destination: destination.trim(),
          month: tripMonth,
          days: tripDays,
          tripStyle: budget,
          companions: companion,
          interests,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "スポットの取得に失敗しました");
      }
      const data = await res.json();
      setCategories(data.categories ?? []);
      setWebSearched(!!data.webSearched);
      setPhase("results");
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSharePlan = useCallback(() => {
    const lines: string[] = [`📍 ${destination}　${dateLabel}\n`];
    for (const cat of categories) {
      const sel = cat.spots.filter((s) => selectedIds.has(s.id));
      if (sel.length === 0) continue;
      lines.push(`【${cat.name}】`);
      sel.forEach((s) => lines.push(`・${s.name}${s.mustSee ? " ★" : ""}`));
      lines.push("");
    }
    lines.push("by GlobeHub AI");
    const text = lines.join("\n");
    const nav = navigator as any;
    if (nav.share) {
      nav.share({ title: `${destination}旅行プラン`, text }).catch(() => {});
    } else {
      nav.clipboard?.writeText(text).then(() => toast({ title: "クリップボードにコピーしました" }));
    }
  }, [categories, selectedIds, destination, dateLabel, toast]);

  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MobileHeader title="AI旅行計画" showBack backPath="/" />

      <main className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full pb-28">

        {/* ── フォーム ── */}
        <div className="space-y-5 mb-5">

          {/* 行き先（オートコンプリート） */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#1E1B4B]">行き先</Label>
            <div className="relative" ref={suggestRef}>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3C237D]/50 pointer-events-none" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  onFocus={() => destination.length >= 1 && setShowSuggestions(suggestions.length > 0)}
                  placeholder="例: パリ、バルセロナ、バリ島"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#EDE9FE] bg-[#FAF9FF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D] focus:border-[#3C237D]"
                />
              </div>
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#EDE9FE] shadow-lg z-20 overflow-hidden">
                  {suggestions.map((d) => (
                    <button
                      key={d}
                      onMouseDown={() => selectDestination(d)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-[#EDE9FE] flex items-center gap-2 transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#3C237D]/60 flex-shrink-0" />
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 旅の日程（日付範囲ピッカー） */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#1E1B4B]">旅の日程</Label>
            <div className="rounded-xl border border-[#EDE9FE] bg-[#FAF9FF] p-3">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">出発日</p>
                  <input
                    type="date"
                    value={departDate}
                    onChange={(e) => handleDepartChange(e.target.value)}
                    min={toDateInput(new Date())}
                    className="w-full h-10 px-2 rounded-lg border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">帰国日</p>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={departDate}
                    className="w-full h-10 px-2 rounded-lg border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-1">
                <CalendarDays className="h-3.5 w-3.5 text-[#3C237D]" />
                <span className="text-sm font-semibold text-[#3C237D]">{dateLabel}</span>
              </div>
            </div>
          </div>

          {/* 予算感 */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#1E1B4B]">予算感</Label>
            <div className="flex gap-2">
              {(["budget", "moderate", "high"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBudget(b)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    budget === b
                      ? "bg-[#3C237D] text-white border-[#3C237D]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#3C237D]/40"
                  }`}
                >
                  {b === "budget" ? "節約" : b === "moderate" ? "標準" : "余裕あり"}
                </button>
              ))}
            </div>
          </div>

          {/* 同行者 */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#1E1B4B]">今回の同行者</Label>
            <div className="grid grid-cols-2 gap-2">
              {COMPANION_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCompanion(companion === c.value ? "" : c.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                    companion === c.value
                      ? "border-[#3C237D] bg-[#3C237D]/5 text-[#3C237D] font-medium"
                      : "border-gray-200 text-gray-700 hover:border-[#3C237D]/40"
                  }`}
                >
                  <span>{c.emoji}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 旅で重視したいこと */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#1E1B4B]">
              重視したいこと
              <span className="ml-2 text-[11px] font-normal text-muted-foreground">複数選択OK</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {INTEREST_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => toggleInterest(o.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                    interests.includes(o.value)
                      ? "border-[#3C237D] bg-[#3C237D]/5 text-[#3C237D] font-medium"
                      : "border-gray-200 text-gray-700 hover:border-[#3C237D]/40"
                  }`}
                >
                  <span>{o.emoji}</span>{o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 検索ボタン */}
          <button
            onClick={handleSearch}
            disabled={loading || !destination.trim()}
            className="w-full h-12 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: "0 4px 14px hsl(257 56% 31% / 0.30)" }}
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />スポットを探しています...</>
              : <><Sparkles className="h-4 w-4" />おすすめスポットを見つける</>
            }
          </button>
        </div>

        {/* ── スポット結果 ── */}
        {phase === "results" && categories.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{destination}のおすすめスポット</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dateLabel}{webSearched ? " • Web検索済み" : ""}
                </p>
              </div>
              {selectedCount > 0 && (
                <span className="text-xs font-medium text-[#3C237D] bg-[#3C237D]/10 px-2 py-1 rounded-full">
                  {selectedCount}件選択中
                </span>
              )}
            </div>

            {categories.map((cat) => (
              <div key={cat.name}>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3C237D] inline-block" />
                  {cat.name}
                </h3>
                <div className="space-y-2">
                  {cat.spots.map((spot) => (
                    <SpotCard
                      key={spot.id}
                      spot={spot}
                      selected={selectedIds.has(spot.id)}
                      onToggle={() => toggleSpot(spot.id)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={handleSearch}
              disabled={loading}
              className="w-full gap-2 rounded-xl border-[#3C237D] text-[#3C237D]"
            >
              <RefreshCw className="h-4 w-4" />別のスポットを探す
            </Button>
          </div>
        )}
      </main>

      {/* 選択スポット数フッター */}
      {selectedCount > 0 && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] p-4 space-y-2 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE]"
          style={{ boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}
        >
          <div className="flex items-center justify-between text-sm px-1">
            <span className="font-semibold text-[#3C237D]">{selectedCount}件選択中</span>
            <button onClick={handleSharePlan} className="flex items-center gap-1 text-gray-500 active:opacity-70">
              {"share" in navigator ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {"share" in navigator ? "共有" : "コピー"}
            </button>
          </div>
          <button
            onClick={handleSharePlan}
            className="w-full h-11 rounded-xl text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}
          >
            <Check className="h-4 w-4" />
            プランを{"share" in navigator ? "共有" : "コピー"}する
          </button>
        </div>
      )}
    </div>
  );
}
