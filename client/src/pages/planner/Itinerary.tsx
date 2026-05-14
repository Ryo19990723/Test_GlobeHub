import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Star, Clock, Wallet, MapPin,
  Bus, ShieldCheck, Zap, BookOpen, Share2, Copy,
  CreditCard, AlertTriangle, Droplets, Plug, Shirt,
} from "lucide-react";
import type { PlanData, Spot } from "./TripPlanner";
import type { CityInfoData } from "./PlanList";
import { useToast } from "@/hooks/use-toast";

// ── セクション色マップ ─────────────────────────────────────────
const SECTION_META = {
  transport:      { label: "移動手段",     icon: Bus,         color: "#3B82F6" },
  safety:         { label: "治安",         icon: ShieldCheck, color: "#EF4444" },
  money:          { label: "お金・チップ", icon: Wallet,       color: "#10B981" },
  infrastructure: { label: "インフラ",     icon: Zap,         color: "#F59E0B" },
  culture:        { label: "文化・タブー", icon: BookOpen,    color: "#8B5CF6" },
} as const;

const INFO_FIELDS: { section: keyof CityInfoData; key: string; label: string; icon: React.ElementType }[] = [
  { section: "transport",      key: "publicTransit",  label: "公共交通",     icon: Bus },
  { section: "transport",      key: "passes",         label: "お得パス",     icon: CreditCard },
  { section: "safety",         key: "dangerousAreas", label: "危険エリア",   icon: AlertTriangle },
  { section: "safety",         key: "commonTroubles", label: "頻出トラブル", icon: ShieldCheck },
  { section: "money",          key: "payment",        label: "決済事情",     icon: CreditCard },
  { section: "money",          key: "tipping",        label: "チップ",       icon: Wallet },
  { section: "infrastructure", key: "waterToilet",    label: "水・トイレ",   icon: Droplets },
  { section: "infrastructure", key: "powerPlugs",     label: "電源・電圧",   icon: Plug },
  { section: "culture",        key: "mannersAndDress",label: "マナー・服装", icon: Shirt },
  { section: "culture",        key: "prohibited",     label: "禁止事項",     icon: AlertTriangle },
];

// ── スポットコンパクト行 ───────────────────────────────────────
function SpotRow({ spot, destination }: { spot: Spot; destination: string }) {
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(spot.name + " " + destination)}`;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      {spot.photoUrl && (
        <img src={spot.photoUrl} alt={spot.name}
          className="w-14 h-10 rounded-lg object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          {spot.mustSee && (
            <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1 py-0.5 rounded-full border border-amber-200">
              ★定番
            </span>
          )}
          <p className="text-sm font-semibold text-[#1E1B4B] truncate">{spot.name}</p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {spot.duration && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
              <Clock className="w-2.5 h-2.5" />{spot.duration}
            </span>
          )}
          {spot.fee && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
              <Wallet className="w-2.5 h-2.5" />{spot.fee}
            </span>
          )}
        </div>
      </div>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
        className="flex-shrink-0 text-[#3C237D]/60 active:text-[#3C237D]">
        <MapPin className="w-4 h-4" />
      </a>
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function Itinerary() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [plan, setPlan]   = useState<PlanData | null>(null);
  const [info, setInfo]   = useState<CityInfoData | null>(null);

  useEffect(() => {
    try {
      const p = sessionStorage.getItem("globehub_plan");
      const c = sessionStorage.getItem("globehub_city_info");
      if (p) setPlan(JSON.parse(p));
      if (c) setInfo(JSON.parse(c));
    } catch { /* ignore */ }
  }, []);

  // カテゴリ別グループ化
  const grouped: { catName: string; spots: Spot[] }[] = [];
  const seen = new Set<string>();
  for (const spot of plan?.spots ?? []) {
    const cat = spot.categoryName ?? "その他";
    if (!seen.has(cat)) { seen.add(cat); grouped.push({ catName: cat, spots: [] }); }
    grouped.find((g) => g.catName === cat)!.spots.push(spot);
  }

  // 都市情報セクション別グループ化
  const infoGrouped = info
    ? (Object.keys(SECTION_META) as (keyof CityInfoData)[]).map((sectionKey) => ({
        meta: SECTION_META[sectionKey],
        sectionKey,
        fields: INFO_FIELDS.filter((f) => f.section === sectionKey).map((f) => ({
          ...f,
          text: (info[sectionKey] as Record<string, string>)[f.key] ?? "",
        })),
      }))
    : [];

  const handleShare = () => {
    if (!plan) return;
    const lines: string[] = [
      `🌍 ${plan.destination} 旅のしおり`,
      plan.dateLabel,
      "",
      "═══ スポットリスト ═══",
    ];
    for (const { catName, spots } of grouped) {
      lines.push(`\n【${catName}】`);
      spots.forEach((s) => {
        lines.push(`・${s.name}${s.mustSee ? " ★" : ""}`);
        const meta = [s.duration && `🕐${s.duration}`, s.fee && `💰${s.fee}`].filter(Boolean).join(" ");
        if (meta) lines.push(`  ${meta}`);
      });
    }
    if (info) {
      lines.push("\n═══ 都市情報 ═══");
      for (const { meta, fields } of infoGrouped) {
        lines.push(`\n【${meta.label}】`);
        fields.forEach((f) => { if (f.text) lines.push(`${f.label}: ${f.text}`); });
      }
    }
    lines.push("\n\nby GlobeHub AI");
    const text = lines.join("\n");
    const nav = navigator as any;
    if (nav.share) nav.share({ title: `${plan.destination}旅のしおり`, text }).catch(() => {});
    else nav.clipboard?.writeText(text).then(() => toast({ title: "しおりをコピーしました" }));
  };

  const destination = plan?.destination ?? "";

  return (
    <div className="min-h-screen bg-[#FAF9FF] flex flex-col">
      {/* ヘッダー */}
      <div className="px-4 pt-5 pb-7"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        <button onClick={() => setLocation("/plan/city-info")}
          className="flex items-center gap-1.5 text-white/80 text-sm mb-4 active:opacity-70">
          <ArrowLeft className="h-4 w-4" />都市情報に戻る
        </button>
        <div className="text-center">
          <p className="text-white/70 text-sm mb-1">🌍 旅のしおり</p>
          <h1 className="text-2xl font-bold text-white">{destination}</h1>
          {plan?.dateLabel && (
            <p className="text-white/80 text-sm mt-1">{plan.dateLabel}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              {plan?.spots.length ?? 0}件のスポット
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-5 pb-40 space-y-5">

        {/* ── スポットリスト ── */}
        <div className="rounded-2xl bg-white border border-[#EDE9FE] overflow-hidden"
          style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#EDE9FE] bg-[#3C237D]/5">
            <MapPin className="w-4 h-4 text-[#3C237D]" />
            <h2 className="text-sm font-bold text-[#1E1B4B]">スポットリスト</h2>
          </div>
          {grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-4">スポットがありません</p>
          ) : (
            grouped.map(({ catName, spots }) => (
              <div key={catName} className="px-4 py-2">
                <p className="text-[11px] font-semibold text-[#3C237D] uppercase tracking-wide mb-1">{catName}</p>
                {spots.map((spot) => (
                  <SpotRow key={spot.id} spot={spot} destination={destination} />
                ))}
              </div>
            ))
          )}
        </div>

        {/* ── 都市情報 ── */}
        {info && infoGrouped.map(({ meta, sectionKey, fields }) => {
          const Icon = meta.icon;
          return (
            <div key={sectionKey}
              className="rounded-2xl bg-white border border-[#EDE9FE] overflow-hidden"
              style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}>
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#EDE9FE]"
                style={{ backgroundColor: meta.color + "12" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: meta.color + "20" }}>
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                </div>
                <h2 className="text-sm font-bold text-[#1E1B4B]">{meta.label}</h2>
              </div>
              <div className="divide-y divide-[#EDE9FE]/60">
                {fields.map((f) => {
                  const FieldIcon = f.icon;
                  return (
                    <div key={f.key} className="px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FieldIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <p className="text-[11px] font-semibold text-muted-foreground">{f.label}</p>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{f.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>

      {/* フッター — BottomNav(64px)の上 */}
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE] z-40"
        style={{ bottom: "64px", boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}>
        <button onClick={handleShare}
          className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: "0 4px 14px hsl(257 56% 31% / 0.28)" }}>
          {"share" in navigator
            ? <><Share2 className="h-4 w-4" />しおりを共有する</>
            : <><Copy className="h-4 w-4" />しおりをコピーする</>}
        </button>
      </div>
    </div>
  );
}
