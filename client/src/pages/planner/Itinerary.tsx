import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { markCompleted, upsertPlan } from "@/lib/planStorage";
import {
  ArrowLeft, Star, Clock, Wallet, MapPin, Lightbulb,
  Bus, ShieldCheck, Zap, BookOpen, Share2, Copy, CheckCircle2,
  CreditCard, AlertTriangle, Droplets, Plug, Shirt, ExternalLink, Map,
} from "lucide-react";
import type { PlanData, Spot } from "./TripPlanner";
import type { CityInfoData } from "./PlanList";
import { useToast } from "@/hooks/use-toast";

// ── 都市情報セクション定義 ────────────────────────────────────
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

// ── 地図URL生成（複数スポット対応）────────────────────────────
function buildMapEmbedUrl(spots: Spot[], dest: string): string {
  const enc = (name: string) => encodeURIComponent(name + " " + dest);
  if (spots.length === 0) return `https://maps.google.com/maps?q=${encodeURIComponent(dest)}&output=embed`;
  if (spots.length === 1) return `https://maps.google.com/maps?q=${enc(spots[0].name)}&output=embed`;
  const origin = enc(spots[0].name);
  const dests = spots.slice(1, 9).map((s) => enc(s.name)).join("+to:");
  return `https://maps.google.com/maps?saddr=${origin}&daddr=${dests}&output=embed`;
}

// ── 全スポット表示カード（詳細すべて表示）────────────────────
function FullSpotCard({ spot, destination }: { spot: Spot; destination: string }) {
  const [imgError, setImgError] = useState(false);
  const hasPhoto = !!spot.photoUrl && !imgError;
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(spot.name + " " + destination)}`;

  return (
    <div className="rounded-2xl border border-[#EDE9FE] bg-white overflow-hidden"
      style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}>

      {/* 写真 */}
      {hasPhoto && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img src={spot.photoUrl as string} alt={spot.name}
            className="w-full h-full object-cover" onError={() => setImgError(true)} />
          {spot.mustSee && (
            <span className="absolute top-2 left-2 flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">
              <Star className="w-2.5 h-2.5" />定番
            </span>
          )}
        </div>
      )}

      <div className="p-3 space-y-2.5">
        {/* 名前・バッジ */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {spot.mustSee && !hasPhoto && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
              <Star className="w-2.5 h-2.5" />定番
            </span>
          )}
          <h3 className="text-sm font-bold text-[#1E1B4B]">{spot.name}</h3>
        </div>

        {/* 所要時間・料金 */}
        <div className="flex items-center gap-3 flex-wrap">
          {spot.duration && (
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Clock className="w-3.5 h-3.5 text-[#3C237D]/60 flex-shrink-0" />{spot.duration}
            </span>
          )}
          {spot.fee && (
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Wallet className="w-3.5 h-3.5 text-[#3C237D]/60 flex-shrink-0" />{spot.fee}
            </span>
          )}
        </div>

        {/* 概要 */}
        {spot.summary && (
          <p className="text-xs text-gray-600 leading-relaxed">{spot.summary}</p>
        )}

        {/* 見どころ */}
        {spot.highlights?.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-gray-500 mb-1.5">見どころ</p>
            <ul className="space-y-1">
              {spot.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3C237D]/50 mt-1.5 flex-shrink-0" />{h}
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

        {/* Googleマップリンク */}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#3C237D] border border-[#3C237D]/30 rounded-xl px-3 py-2 hover:bg-[#EDE9FE] active:scale-[0.98] transition-all">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          Googleマップで詳細を見る
          <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
        </a>
      </div>
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function Itinerary() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [plan, setPlan]         = useState<PlanData | null>(null);
  const [info, setInfo]         = useState<CityInfoData | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    try {
      const p = sessionStorage.getItem("globehub_plan");
      const c = sessionStorage.getItem("globehub_city_info");
      const planData = p ? JSON.parse(p) as PlanData : null;
      const cityInfo = c ? JSON.parse(c) as CityInfoData : null;
      if (planData) setPlan(planData);
      if (cityInfo) setInfo(cityInfo);
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

  const allSpots = plan?.spots ?? [];
  const destination = plan?.destination ?? "";

  const handleComplete = () => {
    if (!plan) return;
    const existingId = sessionStorage.getItem("globehub_plan_id") ?? undefined;
    if (info) {
      if (existingId) markCompleted(existingId, info);
      else {
        const saved = upsertPlan(plan, info);
        sessionStorage.setItem("globehub_plan_id", saved.id);
      }
    } else {
      if (!existingId) {
        const saved = upsertPlan(plan);
        sessionStorage.setItem("globehub_plan_id", saved.id);
      }
    }
    setCompleted(true);
    toast({ title: "🎉 旅のしおりが完成しました！", description: "旅行計画リストに保存されました" });
    setTimeout(() => setLocation("/trip-planner"), 1200);
  };

  const handleShare = () => {
    if (!plan) return;
    const lines: string[] = [`🌍 ${plan.destination} 旅のしおり`, plan.dateLabel, ""];
    lines.push("═══ スポットリスト ═══");
    for (const { catName, spots } of grouped) {
      lines.push(`\n【${catName}】`);
      spots.forEach((s) => {
        lines.push(`・${s.name}${s.mustSee ? " ★" : ""}`);
        if (s.summary) lines.push(`  ${s.summary}`);
        const meta = [s.duration && `🕐${s.duration}`, s.fee && `💰${s.fee}`].filter(Boolean).join(" ");
        if (meta) lines.push(`  ${meta}`);
        if (s.highlights?.length) s.highlights.forEach((h) => lines.push(`  → ${h}`));
        if (s.tip) lines.push(`  💡 ${s.tip}`);
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
    if (nav.share) nav.share({ title: `${destination}旅のしおり`, text }).catch(() => {});
    else nav.clipboard?.writeText(text).then(() => toast({ title: "しおりをコピーしました" }));
  };

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
          {plan?.dateLabel && <p className="text-white/80 text-sm mt-1">{plan.dateLabel}</p>}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              {allSpots.length}件のスポット
            </span>
            {info && (
              <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                都市情報あり
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-5 pb-44 space-y-5">

        {/* ── 全スポット地図 ── */}
        {allSpots.length > 0 && (
          <div className="rounded-2xl bg-white border border-[#EDE9FE] overflow-hidden"
            style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE9FE] bg-[#3C237D]/5">
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4 text-[#3C237D]" />
                <h2 className="text-sm font-bold text-[#1E1B4B]">スポット地図</h2>
              </div>
              <a
                href={allSpots.length >= 2
                  ? `https://www.google.com/maps/dir/${allSpots.slice(0, 8).map((s) => encodeURIComponent(s.name + " " + destination)).join("/")}`
                  : `https://www.google.com/maps/search/${encodeURIComponent(allSpots[0].name + " " + destination)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-[#3C237D] active:opacity-70"
              >
                <ExternalLink className="w-3.5 h-3.5" />Googleマップで開く
              </a>
            </div>
            <iframe
              src={buildMapEmbedUrl(allSpots, destination)}
              className="w-full"
              style={{ height: "280px", border: 0 }}
              allowFullScreen
              loading="lazy"
              title="スポット地図"
            />
            <p className="text-[11px] text-muted-foreground text-center py-2">
              {allSpots.length >= 2 ? `${allSpots.length}件のスポット経路・位置関係` : "スポットの位置"}
            </p>
          </div>
        )}

        {/* ── スポットリスト（詳細すべて表示）── */}
        {grouped.map(({ catName, spots }) => (
          <div key={catName}>
            <h2 className="text-[13px] font-semibold text-[#3C237D] mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3C237D]" />{catName}
              <span className="text-muted-foreground font-normal text-xs ml-1">（{spots.length}件）</span>
            </h2>
            <div className="space-y-3">
              {spots.map((spot) => (
                <FullSpotCard key={spot.id} spot={spot} destination={destination} />
              ))}
            </div>
          </div>
        ))}

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
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE] z-40 space-y-2"
        style={{ bottom: "64px", boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}>

        {/* 共有ボタン（サブ） */}
        <button onClick={handleShare}
          className="w-full h-10 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-[#3C237D] text-[#3C237D] bg-white active:bg-[#EDE9FE] transition-colors">
          {"share" in navigator ? <><Share2 className="h-4 w-4" />しおりを共有</> : <><Copy className="h-4 w-4" />しおりをコピー</>}
        </button>

        {/* 完成ボタン（メイン） */}
        <button
          onClick={handleComplete}
          disabled={completed}
          className="w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all"
          style={{
            background: completed
              ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
              : "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
            boxShadow: completed
              ? "0 4px 14px rgba(16, 185, 129, 0.30)"
              : "0 4px 14px rgba(249, 115, 22, 0.30)",
          }}
        >
          {completed
            ? <><CheckCircle2 className="h-5 w-5" />完成しました！</>
            : <><CheckCircle2 className="h-5 w-5" />しおりを完成させる</>}
        </button>
      </div>
    </div>
  );
}
