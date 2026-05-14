import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Sparkles, Loader2, RefreshCw, Plus, Check,
  CalendarDays, MapPin, Clock, Wallet, Lightbulb,
  ChevronRight, Star, ListChecks,
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
export interface Spot {
  id: string;
  name: string;
  imageQuery?: string;       // Pexels 検索クエリ（英語）
  photoUrl?: string | null;  // null=取得済みだが写真なし, undefined=未取得
  summary: string;
  highlights: string[];
  duration: string;
  fee: string;
  tip: string;
  mustSee: boolean;
  categoryName?: string;
}

interface Category {
  name: string;
  spots: Spot[];
}

// sessionStorage に保存する型
export interface PlanData {
  destination: string;
  dateLabel: string;
  spots: Spot[]; // categoryName 付き
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

// ── SpotCard ─────────────────────────────────────────────────
export function SpotCard({
  spot, selected, onToggle,
}: {
  spot: Spot;
  selected: boolean;
  onToggle: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const hasQuery   = !!spot.imageQuery;
  const isLoading  = hasQuery && spot.photoUrl === undefined;
  const hasPhoto   = !!spot.photoUrl && !imgError;

  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden ${
        selected ? "border-[#3C237D] bg-[#FAF9FF]" : "border-gray-200 bg-white"
      }`}
      style={selected ? { boxShadow: "0 2px 12px hsl(257 56% 31% / 0.10)" } : {}}
    >
      {/* 写真エリア */}
      {(isLoading || hasPhoto) && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
          )}
          {hasPhoto && (
            <img
              src={spot.photoUrl as string}
              alt={spot.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          )}
          {/* 選択時のオーバーレイ */}
          {selected && hasPhoto && (
            <div className="absolute inset-0 bg-[#3C237D]/10 pointer-events-none" />
          )}
          {/* 定番バッジを写真の上に重ねる */}
          {spot.mustSee && hasPhoto && (
            <span className="absolute top-2 left-2 flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">
              <Star className="w-2.5 h-2.5" />定番
            </span>
          )}
        </div>
      )}

      {/* ヘッダー行 */}
      <div className="flex items-start gap-2 p-3 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {/* 写真がない場合のみヘッダーにバッジ表示（写真上に表示済みの場合は非表示） */}
            {spot.mustSee && !hasPhoto && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                <Star className="w-2.5 h-2.5" />定番
              </span>
            )}
            <p className={`text-sm font-bold leading-tight ${selected ? "text-[#3C237D]" : "text-gray-900"}`}>
              {spot.name}
            </p>
          </div>
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
        {/* トグルボタン */}
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
      </div>

      {/* 本文 */}
      <div className="px-3 pb-3 space-y-2.5">
        <p className="text-xs text-gray-600 leading-relaxed">{spot.summary}</p>
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

// ── メインページ ─────────────────────────────────────────────
export default function TripPlanner() {
  const [, setLocation] = useLocation();
  const initDepart = defaultDepart();
  const [destination, setDestination]         = useState("");
  const [suggestions, setSuggestions]         = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [departDate, setDepartDate]           = useState(initDepart);
  const [returnDate, setReturnDate]           = useState(defaultReturn(initDepart));
  const [budget, setBudget]                   = useState<"budget" | "moderate" | "high">("moderate");
  const [companion, setCompanion]             = useState("");
  const [interests, setInterests]             = useState<string[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [categories, setCategories]           = useState<Category[]>([]);
  const [webSearched, setWebSearched]         = useState(false);
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());
  const [selectedSpots, setSelectedSpots]     = useState<Map<string, Spot>>(new Map());
  const suggestRef = useRef<HTMLDivElement>(null);
  const { toast }  = useToast();

  const tripDays  = calcDays(departDate, returnDate);
  const tripMonth = new Date(departDate).toLocaleDateString("ja-JP", { month: "long" });
  const dateLabel = `${fmtDate(departDate)} 〜 ${fmtDate(returnDate)}（${tripDays}日間）`;
  const selectedCount = selectedIds.size;

  const handleDepartChange = (val: string) => {
    setDepartDate(val);
    if (val >= returnDate) {
      const d = new Date(val); d.setDate(d.getDate() + 3);
      setReturnDate(toDateInput(d));
    }
  };

  const handleDestChange = (val: string) => {
    setDestination(val);
    if (val.length >= 1) {
      const f = POPULAR_DESTINATIONS.filter((d) => d.includes(val) || d.toLowerCase().includes(val.toLowerCase())).slice(0, 7);
      setSuggestions(f);
      setShowSuggestions(f.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const toggleInterest = (v: string) =>
    setInterests((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);

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

  const handleSearch = async () => {
    if (!destination.trim()) {
      toast({ title: "行き先を入力してください", variant: "destructive" });
      return;
    }
    setLoading(true);
    setCategories([]);
    setSelectedIds(new Set());
    setSelectedSpots(new Map());
    try {
      const res = await fetch("/api/ai/spot-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ destination: destination.trim(), month: tripMonth, days: tripDays, tripStyle: budget, companions: companion, interests }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "スポットの取得に失敗しました"); }
      const data = await res.json();
      const cats: Category[] = data.categories ?? [];
      setCategories(cats);
      setWebSearched(!!data.webSearched);

      // 写真を非同期で取得（スポット表示後にバックグラウンドでロード）
      const queries = cats.flatMap((c) => c.spots.map((s) => s.imageQuery).filter(Boolean) as string[]);
      if (queries.length > 0) {
        fetch("/api/ai/spot-photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ queries }),
        })
          .then((r) => (r.ok ? r.json() : {}))
          .then((photoMap: Record<string, string>) => {
            setCategories((prev) =>
              prev.map((cat) => ({
                ...cat,
                spots: cat.spots.map((s) => ({
                  ...s,
                  photoUrl: s.imageQuery ? (photoMap[s.imageQuery] ?? null) : null,
                })),
              }))
            );
          })
          .catch(() => {});
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // プランリストページへ遷移 — sessionStorage にデータを保存してから移動
  const goToPlanList = () => {
    const spots: Spot[] = categories.flatMap((cat) =>
      cat.spots
        .filter((s) => selectedSpots.has(s.id))
        .map((s) => ({ ...s, categoryName: cat.name }))
    );
    const planData: PlanData = { destination, dateLabel, spots };
    sessionStorage.setItem("globehub_plan", JSON.stringify(planData));
    setLocation("/plan/list");
  };

  const showResults = categories.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MobileHeader title="AI旅行計画" showBack backPath="/" />

      <main className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full" style={{ paddingBottom: selectedCount > 0 ? "160px" : "100px" }}>

        {/* ── フォーム ── */}
        <div className="space-y-5 mb-6">

          {/* 行き先 */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#1E1B4B]">行き先</Label>
            <div className="relative" ref={suggestRef}>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3C237D]/50 pointer-events-none" />
                <input
                  type="text" value={destination}
                  onChange={(e) => handleDestChange(e.target.value)}
                  onFocus={() => destination.length >= 1 && setShowSuggestions(suggestions.length > 0)}
                  placeholder="例: パリ、バルセロナ、バリ島"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#EDE9FE] bg-[#FAF9FF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]"
                />
              </div>
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#EDE9FE] shadow-lg z-20 overflow-hidden">
                  {suggestions.map((d) => (
                    <button key={d} onMouseDown={() => { setDestination(d); setShowSuggestions(false); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-[#EDE9FE] flex items-center gap-2">
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
                  <input type="date" value={departDate} onChange={(e) => handleDepartChange(e.target.value)} min={toDateInput(new Date())}
                    className="w-full h-10 px-2 rounded-lg border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">帰国日</p>
                  <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} min={departDate}
                    className="w-full h-10 px-2 rounded-lg border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
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
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${budget === b ? "bg-[#3C237D] text-white border-[#3C237D]" : "bg-white text-gray-600 border-gray-200"}`}>
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
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${companion === c.value ? "border-[#3C237D] bg-[#3C237D]/5 text-[#3C237D] font-medium" : "border-gray-200 text-gray-700"}`}>
                  <span>{c.emoji}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 重視したいこと */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#1E1B4B]">
              重視したいこと<span className="ml-2 text-[11px] font-normal text-muted-foreground">複数選択OK</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {INTEREST_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => toggleInterest(o.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${interests.includes(o.value) ? "border-[#3C237D] bg-[#3C237D]/5 text-[#3C237D] font-medium" : "border-gray-200 text-gray-700"}`}>
                  <span>{o.emoji}</span>{o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 検索ボタン */}
          <button onClick={handleSearch} disabled={loading || !destination.trim()}
            className="w-full h-12 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
            style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: "0 4px 14px hsl(257 56% 31% / 0.30)" }}>
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />スポットを探しています...</>
              : <><Sparkles className="h-4 w-4" />おすすめスポットを見つける</>}
          </button>
        </div>

        {/* ── スポット結果 ── */}
        {showResults && (
          <div className="space-y-6">
            {/* 結果ヘッダー */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-[#1E1B4B]">{destination}のおすすめ</p>
                <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}{webSearched ? " • Web検索済み" : ""}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSearch} disabled={loading}
                className="gap-1.5 rounded-xl border-[#3C237D]/40 text-[#3C237D] text-xs">
                <RefreshCw className="h-3.5 w-3.5" />再検索
              </Button>
            </div>

            {/* カテゴリ別スポット */}
            {categories.map((cat) => (
              <div key={cat.name}>
                <h3 className="text-[13px] font-semibold text-[#3C237D] mb-2.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3C237D]" />{cat.name}
                </h3>
                <div className="space-y-3">
                  {cat.spots.map((spot) => (
                    <SpotCard key={spot.id} spot={spot} selected={selectedIds.has(spot.id)} onToggle={() => toggleSpot(spot)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── 固定フッター: BottomNav(64px)の上に配置 ── */}
      {selectedCount > 0 && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE] z-40"
          style={{
            bottom: "64px", // BottomNav の高さ分だけ上にずらす
            boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)",
          }}
        >
          {/* カウンター行 */}
          <div className="flex items-center justify-between mb-2 px-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#3C237D] flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{selectedCount}</span>
              </div>
              <span className="text-sm font-semibold text-[#3C237D]">件を追加済み</span>
            </div>
            <span className="text-xs text-muted-foreground">タップしてプランを確認</span>
          </div>

          {/* プランリストへ行くボタン */}
          <button
            onClick={goToPlanList}
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
