import { useState, useCallback, useRef, useEffect } from "react";
import {
  Sparkles, Loader2, RefreshCw, Plus, Check, Copy, Share2,
  CalendarDays, MapPin, Clock, Wallet, Lightbulb, ChevronRight,
  ArrowLeft, Trash2, Star, ListChecks,
} from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// ── 人気目的地リスト ──────────────────────────────────────────
const POPULAR_DESTINATIONS = [
  "東京","京都","大阪","沖縄","北海道","奈良","鎌倉","箱根","軽井沢","金沢",
  "福岡","長崎","広島","仙台","札幌","那覇",
  "ソウル","釜山","台北","台南","香港","マカオ","上海","北京","成都","西安",
  "バンコク","チェンマイ","プーケット","シンガポール","クアラルンプール",
  "バリ島","ジャカルタ","ハノイ","ホーチミン","ダナン","マニラ","セブ",
  "デリー","ムンバイ","ジャイプール","ネパール","スリランカ",
  "パリ","ロンドン","ローマ","バルセロナ","マドリード","ミラノ","フィレンツェ",
  "ヴェネツィア","アムステルダム","ウィーン","プラハ","ブダペスト","ポルト",
  "リスボン","アテネ","イスタンブール","チューリッヒ","コペンハーゲン",
  "ストックホルム","ヘルシンキ","ダブリン","エディンバラ","クラクフ",
  "ドゥブロヴニク","サントリーニ島",
  "ドバイ","アブダビ","カイロ","マラケシュ","ケープタウン","ザンジバル",
  "ニューヨーク","ロサンゼルス","サンフランシスコ","シカゴ","ラスベガス",
  "マイアミ","ハワイ（ホノルル）","バンクーバー","トロント",
  "メキシコシティ","カンクン","リオデジャネイロ","ブエノスアイレス","マチュピチュ",
  "シドニー","メルボルン","ゴールドコースト","オークランド",
];

// ── 型定義 ──────────────────────────────────────────────────
interface Spot {
  id: string;
  name: string;
  summary: string;
  highlights: string[];
  duration: string;
  fee: string;
  tip: string;
  mustSee: boolean;
}

interface Category {
  name: string;
  spots: Spot[];
}

// ── 選択肢 ────────────────────────────────────────────────────
const COMPANION_OPTIONS = [
  { value: "solo",    label: "一人旅",       emoji: "🧳" },
  { value: "couple",  label: "カップル",     emoji: "❤️" },
  { value: "friends", label: "友人グループ", emoji: "👫" },
  { value: "family",  label: "家族（子連れ）",emoji: "👨‍👩‍👧" },
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

// ── 日付ユーティリティ ─────────────────────────────────────────
function toDateInput(d: Date): string { return d.toISOString().split("T")[0]; }
function defaultDepart(): string { const d = new Date(); d.setDate(d.getDate() + 30); return toDateInput(d); }
function defaultReturn(dep: string): string { const d = new Date(dep); d.setDate(d.getDate() + 6); return toDateInput(d); }
function calcDays(dep: string, ret: string): number { return Math.max(1, Math.round((new Date(ret).getTime() - new Date(dep).getTime()) / 86400000)); }
function fmtDate(s: string): string { return new Date(s).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }); }

// ── SpotCard（豊富な情報付き） ────────────────────────────────
function SpotCard({
  spot, selected, onToggle, showRemove, onRemove,
}: {
  spot: Spot;
  selected: boolean;
  onToggle: () => void;
  showRemove?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden ${
        selected
          ? "border-[#3C237D] bg-[#FAF9FF]"
          : "border-gray-200 bg-white"
      }`}
      style={selected ? { boxShadow: "0 2px 12px hsl(257 56% 31% / 0.10)" } : {}}
    >
      {/* ヘッダー行 */}
      <div className="flex items-start gap-2 p-3 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {spot.mustSee && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                <Star className="w-2.5 h-2.5" />定番
              </span>
            )}
            <p className={`text-sm font-bold leading-tight ${selected ? "text-[#3C237D]" : "text-gray-900"}`}>
              {spot.name}
            </p>
          </div>
          {/* メタ情報チップ */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {spot.duration && (
              <span className="flex items-center gap-0.5 text-[11px] text-gray-500">
                <Clock className="w-3 h-3 flex-shrink-0" />{spot.duration}
              </span>
            )}
            {spot.fee && (
              <span className="flex items-center gap-0.5 text-[11px] text-gray-500">
                <Wallet className="w-3 h-3 flex-shrink-0" />{spot.fee}
              </span>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        {showRemove ? (
          <button
            onClick={onRemove}
            className="flex-shrink-0 w-8 h-8 rounded-full border border-red-200 bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors active:scale-90"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className={`flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
              selected
                ? "border-[#3C237D] bg-[#3C237D] text-white"
                : "border-gray-300 hover:border-[#3C237D] bg-white"
            }`}
          >
            {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-gray-400" />}
          </button>
        )}
      </div>

      {/* 本文 */}
      <div className="px-3 pb-3 space-y-2.5">
        {/* 概要 */}
        <p className="text-xs text-gray-600 leading-relaxed">{spot.summary}</p>

        {/* 見どころ */}
        {spot.highlights?.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-gray-500 mb-1">見どころ</p>
            <ul className="space-y-0.5">
              {spot.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3C237D]/50 mt-1.5 flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 訪問のコツ */}
        {spot.tip && (
          <div className="flex items-start gap-1.5 bg-amber-50 rounded-xl px-2.5 py-2 border border-amber-100">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{spot.tip}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── プラン一覧ビュー ──────────────────────────────────────────
function PlanListView({
  destination,
  dateLabel,
  categories,
  selectedSpots,
  onRemove,
  onBack,
  onShare,
}: {
  destination: string;
  dateLabel: string;
  categories: Category[];
  selectedSpots: Map<string, Spot>;
  onRemove: (id: string) => void;
  onBack: () => void;
  onShare: () => void;
}) {
  // カテゴリ順に選択スポットをグループ化
  const grouped: { catName: string; spots: Spot[] }[] = [];
  for (const cat of categories) {
    const spots = cat.spots.filter((s) => selectedSpots.has(s.id));
    if (spots.length > 0) grouped.push({ catName: cat.name, spots });
  }
  // どのカテゴリにも属さない追加済みスポット（念のため）
  const ungroupedIds = Array.from(selectedSpots.keys()).filter(
    (id) => !categories.some((c) => c.spots.some((s) => s.id === id))
  );

  const totalCount = selectedSpots.size;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ヘッダー */}
      <div
        className="px-4 pt-5 pb-5"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/80 text-sm mb-4 active:opacity-70"
        >
          <ArrowLeft className="h-4 w-4" />スポット検索に戻る
        </button>
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">あなたの旅リスト</h1>
        </div>
        <p className="text-sm text-white/75">{destination} • {dateLabel}</p>
        <span className="mt-2 inline-block text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
          {totalCount}件のスポット
        </span>
      </div>

      {/* スポット一覧 */}
      <main className="flex-1 px-4 py-5 pb-32 space-y-6">
        {grouped.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">スポットが選択されていません</p>
          </div>
        ) : (
          grouped.map(({ catName, spots }) => (
            <section key={catName}>
              <h2 className="text-[13px] font-semibold text-[#3C237D] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3C237D]" />
                {catName}
                <span className="text-muted-foreground font-normal normal-case ml-1">（{spots.length}件）</span>
              </h2>
              <div className="space-y-3">
                {spots.map((spot) => (
                  <SpotCard
                    key={spot.id}
                    spot={spot}
                    selected
                    onToggle={() => {}}
                    showRemove
                    onRemove={() => onRemove(spot.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* 共有フッター */}
      {totalCount > 0 && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] p-4 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE]"
          style={{ boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}
        >
          <button
            onClick={onShare}
            className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}
          >
            {"share" in navigator
              ? <><Share2 className="h-4 w-4" />プランを共有する</>
              : <><Copy className="h-4 w-4" />プランをコピーする</>
            }
          </button>
        </div>
      )}
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function TripPlanner() {
  const initDepart = defaultDepart();
  const [destination, setDestination]         = useState("");
  const [suggestions, setSuggestions]         = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [departDate, setDepartDate]           = useState(initDepart);
  const [returnDate, setReturnDate]           = useState(defaultReturn(initDepart));
  const [budget, setBudget]                   = useState<"budget" | "moderate" | "high">("moderate");
  const [companion, setCompanion]             = useState("");
  const [interests, setInterests]             = useState<string[]>([]);

  const [phase, setPhase]                     = useState<"form" | "results" | "plan">("form");
  const [loading, setLoading]                 = useState(false);
  const [categories, setCategories]           = useState<Category[]>([]);
  const [webSearched, setWebSearched]         = useState(false);

  // 選択済みスポット: Set(id) + Map(id→Spot全データ)
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());
  const [selectedSpots, setSelectedSpots]     = useState<Map<string, Spot>>(new Map());

  const suggestRef = useRef<HTMLDivElement>(null);
  const { toast }  = useToast();

  const tripDays  = calcDays(departDate, returnDate);
  const tripMonth = new Date(departDate).toLocaleDateString("ja-JP", { month: "long" });
  const dateLabel = `${fmtDate(departDate)} 〜 ${fmtDate(returnDate)}（${tripDays}日間）`;

  const handleDepartChange = (val: string) => {
    setDepartDate(val);
    if (val >= returnDate) {
      const d = new Date(val); d.setDate(d.getDate() + 3);
      setReturnDate(toDateInput(d));
    }
  };

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

  const selectDestination = (d: string) => { setDestination(d); setShowSuggestions(false); };

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const toggleInterest = (v: string) =>
    setInterests((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const toggleSpot = (spot: Spot) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(spot.id)) {
        next.delete(spot.id);
        setSelectedSpots((m) => { const n = new Map(m); n.delete(spot.id); return n; });
      } else {
        next.add(spot.id);
        setSelectedSpots((m) => new Map(m).set(spot.id, spot));
      }
      return next;
    });
  };

  const removeSpot = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setSelectedSpots((m) => { const n = new Map(m); n.delete(id); return n; });
  };

  const handleSearch = async () => {
    if (!destination.trim()) {
      toast({ title: "行き先を入力してください", variant: "destructive" });
      return;
    }
    setLoading(true);
    setCategories([]);
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

  const handleShare = useCallback(() => {
    const lines: string[] = [`📍 ${destination}　${dateLabel}\n`];
    const grouped: { catName: string; spots: Spot[] }[] = [];
    for (const cat of categories) {
      const spots = cat.spots.filter((s) => selectedSpots.has(s.id));
      if (spots.length > 0) grouped.push({ catName: cat.name, spots });
    }
    for (const { catName, spots } of grouped) {
      lines.push(`【${catName}】`);
      spots.forEach((s) => {
        lines.push(`・${s.name}${s.mustSee ? " ★" : ""}`);
        lines.push(`  ${s.summary}`);
        lines.push(`  🕐 ${s.duration}  💰 ${s.fee}`);
      });
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
  }, [categories, selectedSpots, destination, dateLabel, toast]);

  const selectedCount = selectedIds.size;

  // ── プラン一覧ページ ─────────────────────────────────────────
  if (phase === "plan") {
    return (
      <PlanListView
        destination={destination}
        dateLabel={dateLabel}
        categories={categories}
        selectedSpots={selectedSpots}
        onRemove={removeSpot}
        onBack={() => setPhase("results")}
        onShare={handleShare}
      />
    );
  }

  // ── フォーム + 結果ページ ────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MobileHeader title="AI旅行計画" showBack backPath="/" />

      <main className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full pb-32">

        {/* フォーム */}
        <div className="space-y-5 mb-6">
          {/* 行き先 */}
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
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#EDE9FE] bg-[#FAF9FF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]"
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
                      <MapPin className="h-3.5 w-3.5 text-[#3C237D]/60 flex-shrink-0" />{d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 旅の日程 */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#1E1B4B]">旅の日程</Label>
            <div className="rounded-xl border border-[#EDE9FE] bg-[#FAF9FF] p-3">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">出発日</p>
                  <input type="date" value={departDate}
                    onChange={(e) => handleDepartChange(e.target.value)}
                    min={toDateInput(new Date())}
                    className="w-full h-10 px-2 rounded-lg border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">帰国日</p>
                  <input type="date" value={returnDate}
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
              {(["budget","moderate","high"] as const).map((b) => (
                <button key={b} onClick={() => setBudget(b)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    budget === b ? "bg-[#3C237D] text-white border-[#3C237D]" : "bg-white text-gray-600 border-gray-200"
                  }`}>
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
                <button key={c.value} onClick={() => setCompanion(companion === c.value ? "" : c.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                    companion === c.value ? "border-[#3C237D] bg-[#3C237D]/5 text-[#3C237D] font-medium" : "border-gray-200 text-gray-700"
                  }`}>
                  <span>{c.emoji}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 重視したいこと */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#1E1B4B]">
              重視したいこと
              <span className="ml-2 text-[11px] font-normal text-muted-foreground">複数選択OK</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {INTEREST_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => toggleInterest(o.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                    interests.includes(o.value) ? "border-[#3C237D] bg-[#3C237D]/5 text-[#3C237D] font-medium" : "border-gray-200 text-gray-700"
                  }`}>
                  <span>{o.emoji}</span>{o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 検索ボタン */}
          <button
            onClick={handleSearch}
            disabled={loading || !destination.trim()}
            className="w-full h-12 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
            style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: "0 4px 14px hsl(257 56% 31% / 0.30)" }}
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />スポットを探しています...</>
              : <><Sparkles className="h-4 w-4" />おすすめスポットを見つける</>
            }
          </button>
        </div>

        {/* スポット結果 */}
        {phase === "results" && categories.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-[#1E1B4B]">{destination}のおすすめ</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dateLabel}{webSearched ? " • Web検索済み" : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearch}
                disabled={loading}
                className="gap-1.5 rounded-xl border-[#3C237D]/40 text-[#3C237D] text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />再検索
              </Button>
            </div>

            {categories.map((cat) => (
              <div key={cat.name}>
                <h3 className="text-[13px] font-semibold text-[#3C237D] mb-2.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3C237D]" />{cat.name}
                </h3>
                <div className="space-y-3">
                  {cat.spots.map((spot) => (
                    <SpotCard
                      key={spot.id}
                      spot={spot}
                      selected={selectedIds.has(spot.id)}
                      onToggle={() => toggleSpot(spot)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 固定フッター: 選択中スポット数 + プランを見るボタン */}
      {selectedCount > 0 && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] p-4 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE]"
          style={{ boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}
        >
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-sm font-semibold text-[#3C237D]">
              {selectedCount}件のスポットを追加済み
            </span>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-xs text-gray-500 active:opacity-70"
            >
              {"share" in navigator ? <Share2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              共有
            </button>
          </div>
          <button
            onClick={() => setPhase("plan")}
            className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: "0 4px 14px hsl(257 56% 31% / 0.28)" }}
          >
            <ListChecks className="h-4 w-4" />
            プランリストを見る
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
