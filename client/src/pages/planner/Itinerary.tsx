import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { saveMultiCityPlan, getMultiCityPlans } from "@/lib/planStorage";
import { clearPlanDraft } from "./types";
import {
  ArrowLeft, Star, Clock, Wallet, MapPin, Lightbulb,
  Bus, ShieldCheck, Zap, BookOpen, Share2, Copy, CheckCircle2,
  CreditCard, AlertTriangle, Droplets, Plug, Shirt, ExternalLink, Map,
  Hotel, Plane, Train, Car, Ship, HelpCircle, ChevronRight, MessageCircle,
  CalendarDays, Globe, FileEdit,
} from "lucide-react";
import type { Spot } from "./TripPlanner";
import type { CityInfoData } from "./PlanList";
import { getPlan, fmtDateJa, datesInRange } from "./types";
import type { MultiCityPlan, CityEntry, PlannedSpotInstance, CityTransport } from "./types";
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

const TRANSPORT_ICONS: Record<string, React.ElementType> = {
  "飛行機": Plane, "電車": Train, "バス": Bus, "車": Car, "フェリー": Ship,
};

// ── 地図URL生成 ───────────────────────────────────────────────
function buildMapEmbedUrl(spots: Spot[], dest: string): string {
  const enc = (name: string) => encodeURIComponent(name + " " + dest);
  if (spots.length === 0) return `https://maps.google.com/maps?q=${encodeURIComponent(dest)}&output=embed`;
  if (spots.length === 1) return `https://maps.google.com/maps?q=${enc(spots[0].name)}&output=embed`;
  const origin = enc(spots[0].name);
  const dests = spots.slice(1, 9).map((s) => enc(s.name)).join("+to:");
  return `https://maps.google.com/maps?saddr=${origin}&daddr=${dests}&output=embed`;
}

// ── スポットカード ─────────────────────────────────────────────
function FullSpotCard({ spot, destination }: { spot: Spot; destination: string }) {
  const [imgError, setImgError] = useState(false);
  const hasPhoto = !!spot.photoUrl && !imgError;
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(spot.name + " " + destination)}`;

  return (
    <div className="rounded-2xl border border-[#EDE9FE] bg-white overflow-hidden"
      style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}>
      {hasPhoto && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img src={spot.photoUrl as string} alt={spot.name}
            className="w-full h-full object-cover" onError={() => setImgError(true)} />
          {spot.mustSee && (
            <span className="absolute top-2 left-2 flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-white/90 px-1.5 py-0.5 rounded-full shadow-sm">
              <Star className="w-2.5 h-2.5" />定番
            </span>
          )}
        </div>
      )}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {spot.mustSee && !hasPhoto && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
              <Star className="w-2.5 h-2.5" />定番
            </span>
          )}
          <h3 className="text-sm font-bold text-[#1E1B4B]">{spot.name}</h3>
        </div>
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
        {spot.summary && <p className="text-xs text-gray-600 leading-relaxed">{spot.summary}</p>}
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
        {spot.tip && (
          <div className="flex items-start gap-1.5 bg-amber-50 rounded-xl px-2.5 py-2 border border-amber-100">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{spot.tip}</p>
          </div>
        )}
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

const BOOKING_STATUS_LABELS: Record<string, string> = {
  booked: "予約済み ✓",
  not_booked: "予約前",
  not_required: "予約不要",
};

// ── 都市間交通カード ──────────────────────────────────────────
function TransportCard({ transport, fromCity, toCity }: {
  transport: CityTransport;
  fromCity: CityEntry;
  toCity: CityEntry;
}) {
  const Icon = TRANSPORT_ICONS[transport.mode] ?? HelpCircle;
  return (
    <div className="flex items-stretch gap-0 my-4">
      <div className="flex flex-col items-center mr-3 flex-shrink-0">
        <div className="w-px flex-1 bg-[#EDE9FE]" />
        <div className="w-8 h-8 rounded-full bg-[#3C237D] flex items-center justify-center my-1">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="w-px flex-1 bg-[#EDE9FE]" />
      </div>
      <div className="flex-1 rounded-2xl border border-[#EDE9FE] bg-[#FAF9FF] px-4 py-3 my-1"
        style={{ boxShadow: "0 2px 8px hsl(257 56% 31% / 0.06)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-bold text-[#3C237D]">
            {fromCity.name} → {toCity.name}
          </p>
          {transport.bookingStatus && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              transport.bookingStatus === "booked"
                ? "bg-green-100 text-green-700"
                : transport.bookingStatus === "not_required"
                  ? "bg-gray-100 text-gray-600"
                  : "bg-amber-50 text-amber-700"
            }`}>
              {BOOKING_STATUS_LABELS[transport.bookingStatus]}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-[#1E1B4B] mt-0.5">
          {transport.mode}{transport.duration ? ` — ${transport.duration}` : ""}
        </p>
        {(transport.operator || transport.serviceNumber) && (
          <p className="text-xs text-gray-600 mt-1">
            {[transport.operator, transport.serviceNumber].filter(Boolean).join(" / ")}
          </p>
        )}
        {(transport.departurePlace || transport.arrivalPlace) && (
          <p className="text-xs text-gray-600 mt-0.5">
            {transport.departurePlace ?? "?"} → {transport.arrivalPlace ?? "?"}
            {(transport.departureTime || transport.arrivalTime) && (
              <span className="text-gray-400 ml-1.5">
                ({transport.departureTime ?? "--:--"} 〜 {transport.arrivalTime ?? "--:--"})
              </span>
            )}
          </p>
        )}
        {transport.bookingNote && (
          <p className="text-xs text-gray-400 mt-0.5">{transport.bookingNote}</p>
        )}
      </div>
    </div>
  );
}

// ── 都市セクション ────────────────────────────────────────────
function CitySection({ plan, city, isLast }: {
  plan: MultiCityPlan;
  city: CityEntry;
  isLast: boolean;
}) {
  const cityData = plan.cities[city.id];
  const cityInfo = cityData?.cityInfo;
  const customQAs = cityData?.customQAs ?? [];
  const dayPlans = cityData?.dayPlans ?? [];
  const accommodations = cityData?.accommodations ?? [];
  const allSpots = cityData?.spots ?? [];

  // 日程順にスポットを表示（dayPlans があれば日程別、なければカテゴリ別）
  const dates = datesInRange(city.startDate, city.endDate);
  const hasDayPlans = dates.some((d) => (dayPlans.find((dp) => dp.date === d)?.instances.length ?? 0) > 0);

  const getAccomForDate = (date: string) =>
    accommodations.filter((a) => a.checkIn <= date && date <= a.checkOut);

  return (
    <div className="space-y-4">
      {/* 都市ヘッダー */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-white/80" />
            <h2 className="text-base font-bold text-white">{city.name}</h2>
          </div>
          <p className="text-sm text-white/70">{city.startDate} 〜 {city.endDate}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
              {allSpots.length}件のスポット
            </span>
            {cityInfo && (
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">都市情報あり</span>
            )}
          </div>
        </div>
      </div>

      {/* 全スポット地図 */}
      {allSpots.length > 0 && (
        <div className="rounded-2xl bg-white border border-[#EDE9FE] overflow-hidden"
          style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE9FE] bg-[#3C237D]/5">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-[#3C237D]" />
              <h3 className="text-sm font-bold text-[#1E1B4B]">スポット地図</h3>
            </div>
            <a href={
              allSpots.length >= 2
                ? `https://www.google.com/maps/dir/${allSpots.slice(0, 8).map((s) => encodeURIComponent(s.name + " " + city.name)).join("/")}`
                : `https://www.google.com/maps/search/${encodeURIComponent(allSpots[0].name + " " + city.name)}`
            } target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-[#3C237D] active:opacity-70">
              <ExternalLink className="w-3.5 h-3.5" />Googleマップで開く
            </a>
          </div>
          <iframe
            src={buildMapEmbedUrl(allSpots, city.name)}
            className="w-full" style={{ height: "240px", border: 0 }}
            allowFullScreen loading="lazy" title={`${city.name}スポット地図`} />
        </div>
      )}

      {/* 日程別スポット（dayPlansがある場合） */}
      {hasDayPlans && (
        <div className="space-y-4">
          {dates.map((date, dayIdx) => {
            const dp = dayPlans.find((d) => d.date === date);
            const instances: PlannedSpotInstance[] = dp?.instances ?? [];
            const accoms = getAccomForDate(date);
            return (
              <div key={date} className="rounded-2xl border border-[#EDE9FE] overflow-hidden"
                style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}>
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#EDE9FE] bg-[#3C237D]/5">
                  <CalendarDays className="w-4 h-4 text-[#3C237D]" />
                  <h3 className="text-sm font-bold text-[#1E1B4B]">Day {dayIdx + 1} — {fmtDateJa(date)}</h3>
                </div>
                <div className="p-3 space-y-3">
                  {instances.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">スポットなし</p>
                  ) : (
                    instances.map((inst, i) => (
                      <div key={inst.instanceId} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#3C237D]/10 flex items-center justify-center text-[10px] font-bold text-[#3C237D] flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <FullSpotCard spot={inst.spot} destination={city.name} />
                        </div>
                      </div>
                    ))
                  )}
                  {accoms.length > 0 && (
                    <div className="border-t border-[#EDE9FE] pt-3 space-y-2">
                      {accoms.map((a) => (
                        <div key={a.id} className="flex items-center gap-2.5 rounded-xl bg-[#FAF9FF] border border-[#EDE9FE] px-3 py-2">
                          <Hotel className="w-4 h-4 text-[#3C237D] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#1E1B4B]">{a.name}</p>
                            <p className="text-[10px] text-gray-400">チェックイン {a.checkIn} 〜 チェックアウト {a.checkOut}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* dayPlansがない場合 — カテゴリ別スポット一覧 */}
      {!hasDayPlans && allSpots.length > 0 && (() => {
        const grouped: { catName: string; spots: Spot[] }[] = [];
        const seen = new Set<string>();
        for (const spot of allSpots) {
          const cat = spot.categoryName ?? "スポット";
          if (!seen.has(cat)) { seen.add(cat); grouped.push({ catName: cat, spots: [] }); }
          grouped.find((g) => g.catName === cat)!.spots.push(spot);
        }
        return (
          <div className="space-y-4">
            {grouped.map(({ catName, spots }) => (
              <div key={catName}>
                <h3 className="text-[13px] font-semibold text-[#3C237D] mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3C237D]" />{catName}
                  <span className="text-muted-foreground font-normal text-xs ml-1">（{spots.length}件）</span>
                </h3>
                <div className="space-y-3">
                  {spots.map((spot) => <FullSpotCard key={spot.id} spot={spot} destination={city.name} />)}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* 都市情報 */}
      {cityInfo && (
        <div className="space-y-3">
          <h3 className="text-[13px] font-semibold text-[#1E1B4B] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#3C237D]" />{city.name}の旅行情報
          </h3>
          {(Object.keys(SECTION_META) as (keyof CityInfoData)[]).map((sectionKey) => {
            const meta = SECTION_META[sectionKey];
            const Icon = meta.icon;
            const fields = INFO_FIELDS.filter((f) => f.section === sectionKey).map((f) => ({
              ...f,
              text: ((cityInfo[sectionKey] as Record<string, string> | undefined)?.[f.key]) ?? "",
            })).filter((f) => f.text);
            if (fields.length === 0) return null;
            return (
              <div key={sectionKey} className="rounded-2xl border border-[#EDE9FE] overflow-hidden"
                style={{ boxShadow: "0 2px 8px hsl(257 56% 31% / 0.05)" }}>
                <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#EDE9FE]"
                  style={{ backgroundColor: meta.color + "10" }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: meta.color + "20" }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                  </div>
                  <h4 className="text-xs font-bold text-[#1E1B4B]">{meta.label}</h4>
                </div>
                <div className="divide-y divide-[#EDE9FE]/60">
                  {fields.map((f) => {
                    const FIcon = f.icon;
                    return (
                      <div key={f.key} className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <FIcon className="w-3 h-3 text-muted-foreground" />
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">{f.label}</p>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{f.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* カスタムQ&A */}
      {customQAs.length > 0 && (
        <div className="rounded-2xl border border-[#EDE9FE] overflow-hidden"
          style={{ boxShadow: "0 2px 8px hsl(257 56% 31% / 0.05)" }}>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#EDE9FE] bg-[#3C237D]/5">
            <MessageCircle className="w-4 h-4 text-[#3C237D]" />
            <h4 className="text-xs font-bold text-[#1E1B4B]">その他 — AIへの質問</h4>
          </div>
          <div className="p-4 space-y-3">
            {customQAs.map((qa) => (
              <div key={qa.id} className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-[#3C237D] bg-[#EDE9FE] px-1.5 py-0.5 rounded flex-shrink-0">Q</span>
                  <p className="text-xs font-semibold text-[#1E1B4B]">{qa.question}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex-shrink-0">A</span>
                  <p className="text-xs text-gray-700 leading-relaxed">{qa.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function Itinerary() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [plan] = useState<MultiCityPlan | null>(() => getPlan());
  const [completed, setCompleted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!plan) return;
    const exists = getMultiCityPlans().some((p) => p.id === plan.id);
    if (exists) {
      setIsSaved(true);
      saveMultiCityPlan(plan); // セッションの変更（DayPlanner編集後）を自動反映
    }
  }, []);

  const cities = plan?.setup.cities ?? [];
  const totalSpots = plan
    ? Object.values(plan.cities).reduce((acc, c) => acc + c.spots.length, 0)
    : 0;

  const handleComplete = () => {
    if (!plan) return;
    saveMultiCityPlan(plan);
    clearPlanDraft();
    setCompleted(true);
    setIsSaved(true);
    toast({ title: "🎉 旅のしおりが完成しました！", description: "旅行計画リストに保存されました" });
    setTimeout(() => setLocation("/trip-planner"), 1200);
  };

  const handleEdit = () => {
    setLocation("/plan/day-planner");
  };

  const handleShare = () => {
    if (!plan) return;
    const lines: string[] = [`🌍 ${plan.setup.title}`, ""];
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      const cityData = plan.cities[city.id];
      lines.push(`═══ ${city.name}（${city.startDate}〜${city.endDate}）═══`);
      const spots = cityData?.spots ?? [];
      if (spots.length > 0) {
        spots.forEach((s) => {
          lines.push(`・${s.name}${s.mustSee ? " ★" : ""}`);
          if (s.summary) lines.push(`  ${s.summary}`);
          const meta = [s.duration && `🕐${s.duration}`, s.fee && `💰${s.fee}`].filter(Boolean).join(" ");
          if (meta) lines.push(`  ${meta}`);
          if (s.highlights?.length) s.highlights.forEach((h) => lines.push(`  → ${h}`));
          if (s.tip) lines.push(`  💡 ${s.tip}`);
        });
      }
      if (i < cities.length - 1) {
        const transport = plan.transports.find((t) => t.fromCityId === city.id && t.toCityId === cities[i + 1].id);
        if (transport) {
          const tParts = [transport.mode];
          if (transport.duration) tParts.push(transport.duration);
          if (transport.operator) tParts.push(`[${transport.operator}]`);
          if (transport.serviceNumber) tParts.push(transport.serviceNumber);
          if (transport.departurePlace && transport.arrivalPlace)
            tParts.push(`${transport.departurePlace}→${transport.arrivalPlace}`);
          if (transport.departureTime && transport.arrivalTime)
            tParts.push(`${transport.departureTime}〜${transport.arrivalTime}`);
          if (transport.bookingStatus)
            tParts.push({ booked: "予約済み", not_booked: "予約前", not_required: "予約不要" }[transport.bookingStatus]);
          if (transport.bookingNote) tParts.push(`備考:${transport.bookingNote}`);
          lines.push(`\n✈ ${city.name}→${cities[i + 1].name}: ${tParts.join(" / ")}`);
        }
      }
      lines.push("");
    }
    lines.push("\nby GlobeHub AI");
    const text = lines.join("\n");
    const nav = navigator as any;
    if (nav.share) nav.share({ title: `${plan.setup.title} 旅のしおり`, text }).catch(() => {});
    else nav.clipboard?.writeText(text).then(() => toast({ title: "しおりをコピーしました" }));
  };

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Globe className="w-12 h-12 text-[#3C237D]/20" />
        <p className="text-sm text-muted-foreground">旅行計画が見つかりません</p>
        <button onClick={() => setLocation("/trip-planner")}
          className="text-sm font-semibold text-[#3C237D] underline underline-offset-2">
          旅行計画トップへ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FF] flex flex-col">
      {/* ヘッダー */}
      <div className="px-4 pt-5 pb-7"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        <button onClick={() => setLocation(isSaved ? "/trip-planner" : "/plan/day-planner")}
          className="flex items-center gap-1.5 text-white/80 text-sm mb-4 active:opacity-70">
          <ArrowLeft className="h-4 w-4" />{isSaved ? "旅行計画一覧へ" : "日程設定に戻る"}
        </button>
        <div className="text-center">
          <p className="text-white/70 text-sm mb-1">🌍 旅のしおり</p>
          <h1 className="text-xl font-bold text-white">{plan.setup.title}</h1>
          <p className="text-white/70 text-sm mt-1">
            {cities[0]?.startDate} 〜 {cities[cities.length - 1]?.endDate}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              {cities.length}都市
            </span>
            <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              {totalSpots}件のスポット
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-5 pb-44 space-y-8">
        {cities.map((city, i) => (
          <div key={city.id}>
            <CitySection plan={plan} city={city} isLast={i === cities.length - 1} />
            {i < cities.length - 1 && (() => {
              const transport = plan.transports.find((t) => t.fromCityId === city.id && t.toCityId === cities[i + 1].id);
              return transport ? (
                <TransportCard transport={transport} fromCity={city} toCity={cities[i + 1]} />
              ) : (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[#EDE9FE]" />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ChevronRight className="w-3.5 h-3.5" />
                    {city.name} → {cities[i + 1].name}
                  </div>
                  <div className="flex-1 h-px bg-[#EDE9FE]" />
                </div>
              );
            })()}
          </div>
        ))}
      </main>

      {/* フッター */}
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE] z-40 space-y-2"
        style={{ bottom: "64px", boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}>
        <button onClick={handleShare}
          className="w-full h-10 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-[#3C237D] text-[#3C237D] bg-white active:bg-[#EDE9FE] transition-colors">
          {"share" in navigator ? <><Share2 className="h-4 w-4" />しおりを共有</> : <><Copy className="h-4 w-4" />しおりをコピー</>}
        </button>
        {isSaved ? (
          <button onClick={handleEdit}
            className="w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-white"
            style={{
              background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)",
              boxShadow: "0 4px 14px hsl(257 56% 31% / 0.28)",
            }}>
            <FileEdit className="h-5 w-5" />編集する
          </button>
        ) : (
          <button onClick={handleComplete} disabled={completed}
            className="w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all"
            style={{
              background: completed
                ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                : "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
              boxShadow: completed
                ? "0 4px 14px rgba(16, 185, 129, 0.30)"
                : "0 4px 14px rgba(249, 115, 22, 0.30)",
            }}>
            {completed
              ? <><CheckCircle2 className="h-5 w-5" />完成しました！</>
              : <><CheckCircle2 className="h-5 w-5" />しおりを完成させる</>}
          </button>
        )}
      </div>
    </div>
  );
}
