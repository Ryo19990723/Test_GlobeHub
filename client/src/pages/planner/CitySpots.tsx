import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Sparkles, Loader2, Plus, Check, Star,
  Clock, Wallet, Lightbulb, ChevronRight, MapPin, RefreshCw,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Spot } from "./TripPlanner";
import { getPlan, savePlanSession, currentCity } from "./types";
import { PlannerProgress } from "./PlannerProgress";

// ── カテゴリ定義 ─────────────────────────────────────────────
const SIGHTSEEING_OPTIONS = [
  { value: "history",      label: "歴史・文化",       emoji: "🏛️" },
  { value: "nature",       label: "自然・絶景",       emoji: "🏔️" },
  { value: "art",          label: "アート・デザイン", emoji: "🎨" },
  { value: "architecture", label: "建築・都市",       emoji: "🏙️" },
  { value: "temple",       label: "寺社・聖地",       emoji: "⛩️" },
  { value: "photo",        label: "フォトジェニック", emoji: "📸" },
  { value: "outdoor",      label: "アウトドア・冒険", emoji: "🏄" },
  { value: "shopping",     label: "ショッピング・土産",emoji: "🛍️" },
  { value: "nightlife",    label: "ナイトライフ",     emoji: "🌙" },
  { value: "wellness",     label: "温泉・スパ",       emoji: "♨️" },
  { value: "music",        label: "音楽・エンタメ",   emoji: "🎵" },
  { value: "hidden",       label: "穴場・ローカル",   emoji: "🗺️" },
  { value: "experience",   label: "体験・アクティビティ", emoji: "🎡" },
];

const FOOD_OPTIONS = [
  { value: "fine_dining",  label: "高級レストラン",    emoji: "🍽️" },
  { value: "casual",       label: "カジュアル・中級店", emoji: "🍴" },
  { value: "local",        label: "ローカル食堂・大衆店",emoji: "🏪" },
  { value: "street",       label: "ストリートフード・屋台",emoji: "🥘" },
  { value: "cafe",         label: "カフェ・スイーツ・バー",emoji: "☕" },
];

// ── SpotCard ─────────────────────────────────────────────────
function SpotCard({ spot, selected, onToggle }: { spot: Spot; selected: boolean; onToggle: () => void }) {
  const [imgError, setImgError] = useState(false);
  const hasPhoto = !!spot.photoUrl && !imgError;
  const isLoading = !!spot.imageQuery && spot.photoUrl === undefined;

  return (
    <div className={`rounded-2xl border transition-all overflow-hidden ${selected ? "border-[#3C237D] bg-[#FAF9FF]" : "border-gray-200 bg-white"}`}
      style={selected ? { boxShadow: "0 2px 12px hsl(257 56% 31% / 0.10)" } : {}}>
      {(isLoading || hasPhoto) && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {isLoading && <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />}
          {hasPhoto && <img src={spot.photoUrl as string} alt={spot.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />}
          {spot.mustSee && hasPhoto && (
            <span className="absolute top-2 left-2 flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-white/90 px-1.5 py-0.5 rounded-full shadow-sm">
              <Star className="w-2.5 h-2.5" />定番
            </span>
          )}
        </div>
      )}
      <div className="flex items-start gap-2 p-3 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {spot.mustSee && !hasPhoto && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                <Star className="w-2.5 h-2.5" />定番
              </span>
            )}
            <p className={`text-sm font-bold leading-tight ${selected ? "text-[#3C237D]" : "text-gray-900"}`}>{spot.name}</p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {spot.duration && <span className="flex items-center gap-0.5 text-[11px] text-gray-500"><Clock className="w-3 h-3" />{spot.duration}</span>}
            {spot.fee && <span className="flex items-center gap-0.5 text-[11px] text-gray-500"><Wallet className="w-3 h-3" />{spot.fee}</span>}
          </div>
        </div>
        <button onClick={onToggle}
          className={`flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${selected ? "border-[#3C237D] bg-[#3C237D] text-white" : "border-gray-300 hover:border-[#3C237D] bg-white"}`}>
          {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-gray-400" />}
        </button>
      </div>
      <div className="px-3 pb-3 space-y-2">
        {spot.summary && <p className="text-xs text-gray-600 leading-relaxed">{spot.summary}</p>}
        {spot.highlights?.length > 0 && (
          <ul className="space-y-0.5">
            {spot.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3C237D]/50 mt-1.5 flex-shrink-0" />{h}
              </li>
            ))}
          </ul>
        )}
        {spot.tip && (
          <div className="flex items-start gap-1.5 bg-amber-50 rounded-xl px-2.5 py-2 border border-amber-100">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">{spot.tip}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── メイン ────────────────────────────────────────────────────
export default function CitySpots() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const plan = getPlan();
  const city = plan ? currentCity(plan) : undefined;

  const [sightseeing, setSightseeing] = useState<string[]>([]);
  const [food, setFood]               = useState<string[]>([]);
  const [loading, setLoading]         = useState(false);
  const [categories, setCategories]   = useState<{ name: string; spots: Spot[] }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSight = (v: string) => setSightseeing((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const toggleFood  = (v: string) => setFood((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const toggleSpot  = (spot: Spot) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(spot.id) ? next.delete(spot.id) : next.add(spot.id);
      return next;
    });
  };

  const interests = [
    ...sightseeing,
    ...food.map((f) => `food_${f}`),
  ];

  const handleSearch = async () => {
    if (!city) return;
    if (interests.length === 0) { toast({ title: "探したいスポットを選んでください", variant: "destructive" }); return; }
    setLoading(true);
    setCategories([]);
    try {
      const setup = plan!.setup;
      const res = await fetch("/api/ai/spot-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          destination: city.name,
          month: new Date(city.startDate).toLocaleDateString("ja-JP", { month: "long" }),
          days: Math.max(1, Math.round((new Date(city.endDate).getTime() - new Date(city.startDate).getTime()) / 86400000) + 1),
          tripStyle: setup.budget,
          companions: setup.companion,
          interests,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "取得失敗"); }
      const data = await res.json();
      const cats = data.categories ?? [];
      setCategories(cats);
      // 写真を非同期で取得
      const queries = cats.flatMap((c: any) => c.spots.map((s: Spot) => s.imageQuery).filter(Boolean)) as string[];
      if (queries.length > 0) {
        fetch("/api/ai/spot-photos", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ queries }),
        }).then((r) => r.ok ? r.json() : {}).then((pm: Record<string, string>) => {
          setCategories((prev) => prev.map((cat) => ({
            ...cat,
            spots: cat.spots.map((s) => ({ ...s, photoUrl: s.imageQuery ? (pm[s.imageQuery] ?? null) : null })),
          })));
        }).catch(() => {});
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!plan || !city) return;
    const allSpots = categories.flatMap((cat) => cat.spots.filter((s) => selectedIds.has(s.id)));
    const updated = { ...plan };
    if (!updated.cities[city.id]) {
      updated.cities[city.id] = { spots: [], customQAs: [], dayPlans: [], accommodations: [] };
    }
    updated.cities[city.id].spots = allSpots;
    savePlanSession(updated);

    // DayPlannerからスポット追加で来た場合、既存の都市情報があればCityInfoをスキップ
    const returnFlag = sessionStorage.getItem("globehub_day_planner_return") === "true";
    if (returnFlag) {
      const existingInfo = updated.cities[city.id]?.cityInfo;
      const hasInfo = existingInfo && typeof existingInfo.transport === "object" && existingInfo.transport !== null;
      if (hasInfo) {
        sessionStorage.removeItem("globehub_day_planner_return");
        setLocation("/plan/day-planner");
        return;
      }
    }
    setLocation("/plan/city-info");
  };

  if (!plan || !city) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">旅行設定が見つかりません</p>
          <button onClick={() => setLocation("/plan/setup")} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}>
            最初から始める
          </button>
        </div>
      </div>
    );
  }

  const cityLabel = `${plan.currentCityIndex + 1}/${plan.setup.cities.length}: ${city.name}`;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-4 pt-5 pb-5"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        <button onClick={() => setLocation("/plan/setup")}
          className="flex items-center gap-1.5 text-white/80 text-sm mb-3 active:opacity-70">
          <ArrowLeft className="h-4 w-4" />基本設定に戻る
        </button>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-white" />
          <div>
            <h1 className="text-lg font-bold text-white">{city.name}のスポットを探す</h1>
            <p className="text-xs text-white/70">{cityLabel} • {city.startDate} 〜 {city.endDate}</p>
          </div>
        </div>
      </div>
      <PlannerProgress step={2} cityIndex={plan.currentCityIndex} totalCities={plan.setup.cities.length} />

      <main className="flex-1 px-4 py-5 pb-36 space-y-5">
        {/* 観光スポット */}
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold text-[#1E1B4B]">
            観光スポット<span className="ml-2 text-[11px] font-normal text-muted-foreground">複数選択OK</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {SIGHTSEEING_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => toggleSight(o.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${sightseeing.includes(o.value) ? "border-[#3C237D] bg-[#3C237D]/5 text-[#3C237D] font-medium" : "border-gray-200 text-gray-700"}`}>
                <span>{o.emoji}</span>{o.label}
              </button>
            ))}
          </div>
        </div>

        {/* グルメ・食 */}
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold text-[#1E1B4B]">
            グルメ・食<span className="ml-2 text-[11px] font-normal text-muted-foreground">複数選択OK</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {FOOD_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => toggleFood(o.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${food.includes(o.value) ? "border-[#3C237D] bg-[#3C237D]/5 text-[#3C237D] font-medium" : "border-gray-200 text-gray-700"}`}>
                <span>{o.emoji}</span>{o.label}
              </button>
            ))}
          </div>
        </div>

        {/* 検索ボタン */}
        <button onClick={handleSearch} disabled={loading || interests.length === 0}
          className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: interests.length > 0 ? "0 4px 14px hsl(257 56% 31% / 0.30)" : "none" }}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />スポットを探しています...</>
                   : <><Sparkles className="h-4 w-4" />おすすめスポットを見つける</>}
        </button>

        {/* 結果 */}
        {categories.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold text-[#1E1B4B]">{city.name}のおすすめ</p>
              <button onClick={handleSearch} disabled={loading}
                className="flex items-center gap-1.5 text-xs font-medium text-[#3C237D] border border-[#3C237D]/40 px-2.5 py-1 rounded-full active:bg-[#EDE9FE]">
                <RefreshCw className="h-3 w-3" />再検索
              </button>
            </div>
            {categories.map((cat) => {
              const isPersonal = cat.name === "あなたへのおすすめ";
              return (
                <div key={cat.name}>
                  {isPersonal ? (
                    <h3 className="text-[13px] font-semibold mb-2.5 flex items-center gap-1.5"
                      style={{ color: "#B45309" }}>
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      ✨ {cat.name}
                    </h3>
                  ) : (
                    <h3 className="text-[13px] font-semibold text-[#3C237D] mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#3C237D]" />{cat.name}
                    </h3>
                  )}
                  <div className="space-y-3">
                    {cat.spots.map((spot) => (
                      <SpotCard key={spot.id} spot={spot} selected={selectedIds.has(spot.id)} onToggle={() => toggleSpot(spot)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* フッター */}
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE] z-40"
        style={{ bottom: "64px", boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}>
        {selectedIds.size > 0 && (
          <p className="text-xs text-center text-[#3C237D] font-semibold mb-2">{selectedIds.size}件を選択中</p>
        )}
        <button onClick={handleNext} disabled={selectedIds.size === 0}
          className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: selectedIds.size > 0 ? "0 4px 14px hsl(257 56% 31% / 0.28)" : "none" }}>
          次へ：{city.name}の都市情報を確認
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
