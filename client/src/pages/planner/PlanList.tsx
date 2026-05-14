import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Trash2, Star, Clock, Wallet, Lightbulb,
  Share2, Copy, ListChecks, MapPin, Map, ExternalLink,
  PlusCircle, ChevronRight,
} from "lucide-react";
import type { Spot, PlanData } from "./TripPlanner";
import { useToast } from "@/hooks/use-toast";

// ── 都市情報の型（CityInfo.tsx と共有）─────────────────────────
export interface CityInfoData {
  transport: { publicTransit: string; passes: string };
  safety:    { dangerousAreas: string; commonTroubles: string };
  money:     { payment: string; tipping: string };
  infrastructure: { waterToilet: string; powerPlugs: string };
  culture:   { mannersAndDress: string; prohibited: string };
}

// ── スポットカード ──────────────────────────────────────────────
function PlanSpotCard({ spot, destination, onRemove }: {
  spot: Spot;
  destination: string;
  onRemove: () => void;
}) {
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

      {/* ヘッダー */}
      <div className="flex items-start gap-2 p-3 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {spot.mustSee && !hasPhoto && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                <Star className="w-2.5 h-2.5" />定番
              </span>
            )}
            <p className="text-sm font-bold text-[#1E1B4B] leading-tight">{spot.name}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
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
        {/* 削除ボタン */}
        <button onClick={onRemove}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center active:scale-90 transition-all hover:bg-red-100">
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
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
        {/* Googleマップリンク — テキスト付きで視認性UP */}
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
export default function PlanList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [plan, setPlan]       = useState<PlanData | null>(null);
  const [spots, setSpots]     = useState<Spot[]>([]);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("globehub_plan");
    if (!raw) return;
    try {
      const data: PlanData = JSON.parse(raw);
      setPlan(data);
      setSpots(data.spots ?? []);
    } catch { /* ignore */ }
  }, []);

  const removeSpot = (id: string) => {
    setSpots((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (plan) sessionStorage.setItem("globehub_plan", JSON.stringify({ ...plan, spots: next }));
      return next;
    });
  };

  // カテゴリ別グループ化
  const grouped: { catName: string; spots: Spot[] }[] = [];
  const seen = new Set<string>();
  for (const spot of spots) {
    const cat = spot.categoryName ?? "その他";
    if (!seen.has(cat)) { seen.add(cat); grouped.push({ catName: cat, spots: [] }); }
    grouped.find((g) => g.catName === cat)!.spots.push(spot);
  }

  // スポット追加検索（追加モードで /plan に戻る）
  const handleAddMore = () => {
    sessionStorage.setItem("globehub_plan_append", "true");
    setLocation("/plan");
  };

  // 複数スポット対応の地図URL（経路表示で全スポットにピン）
  const buildMapEmbedUrl = (spots: Spot[], dest: string): string => {
    const enc = (name: string) => encodeURIComponent(name + " " + dest);
    if (spots.length === 0) return `https://maps.google.com/maps?q=${encodeURIComponent(dest)}&output=embed`;
    if (spots.length === 1) return `https://maps.google.com/maps?q=${enc(spots[0].name)}&output=embed`;
    const origin = enc(spots[0].name);
    const dests = spots.slice(1, 9).map((s) => enc(s.name)).join("+to:");
    return `https://maps.google.com/maps?saddr=${origin}&daddr=${dests}&output=embed`;
  };

  // 外部で全スポットを開くURL（Googleマップのルート表示）
  const allSpotsMapUrl = plan && spots.length > 0
    ? spots.length === 1
      ? `https://www.google.com/maps/search/${encodeURIComponent(spots[0].name + " " + plan.destination)}`
      : `https://www.google.com/maps/dir/${spots.slice(0, 8).map((s) => encodeURIComponent(s.name + " " + plan.destination)).join("/")}`
    : "";

  // 次のページ（都市情報）へ
  const goToCityInfo = () => setLocation("/plan/city-info");

  const handleShare = () => {
    if (!plan || spots.length === 0) return;
    const lines = [`📍 ${plan.destination}　${plan.dateLabel}\n`];
    for (const { catName, spots: cs } of grouped) {
      lines.push(`【${catName}】`);
      cs.forEach((s) => {
        lines.push(`・${s.name}${s.mustSee ? " ★" : ""}`);
        if (s.summary) lines.push(`  ${s.summary}`);
        const meta = [s.duration && `🕐 ${s.duration}`, s.fee && `💰 ${s.fee}`].filter(Boolean).join("  ");
        if (meta) lines.push(`  ${meta}`);
      });
      lines.push("");
    }
    lines.push("by GlobeHub AI");
    const text = lines.join("\n");
    const nav = navigator as any;
    if (nav.share) nav.share({ title: `${plan.destination}旅行プラン`, text }).catch(() => {});
    else nav.clipboard?.writeText(text).then(() => toast({ title: "クリップボードにコピーしました" }));
  };

  const destination = plan?.destination ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="px-4 pt-5 pb-6"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        <button onClick={() => setLocation("/plan")}
          className="flex items-center gap-1.5 text-white/80 text-sm mb-4 active:opacity-70">
          <ArrowLeft className="h-4 w-4" />スポット検索に戻る
        </button>
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">プランリスト</h1>
        </div>
        {plan && (
          <>
            <div className="flex items-center gap-1.5 text-white/80 text-sm mt-1">
              <MapPin className="w-3.5 h-3.5" /><span>{destination}</span>
              <span className="mx-1">•</span><span>{plan.dateLabel}</span>
            </div>
            <span className="mt-2 inline-block text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              {spots.length}件のスポット
            </span>
          </>
        )}
      </div>

      {/* アクションバー */}
      <div className="px-4 py-3 bg-white border-b border-[#EDE9FE] flex items-center gap-2">
        {/* スポット追加 */}
        <button onClick={handleAddMore}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-[#3C237D] text-[#3C237D] bg-white active:bg-[#EDE9FE] transition-colors">
          <PlusCircle className="w-4 h-4" />スポットを追加
        </button>

        {/* 地図トグル */}
        <button onClick={() => setShowMap((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
            showMap ? "bg-[#3C237D] text-white border-[#3C237D]" : "border-gray-200 text-gray-600 bg-white"
          }`}>
          <Map className="w-4 h-4" />地図
        </button>

        {/* 全スポットをGoogleマップで */}
        {spots.length > 0 && (
          <a href={allSpotsMapUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 bg-white active:bg-gray-50 transition-colors ml-auto">
            <ExternalLink className="w-4 h-4" />一括
          </a>
        )}
      </div>

      {/* 地図 iframe */}
      {showMap && destination && (
        <div className="px-4 pt-3">
          <div className="rounded-2xl overflow-hidden border border-[#EDE9FE]"
            style={{ boxShadow: "0 2px 12px hsl(257 56% 31% / 0.08)" }}>
            <iframe
              src={buildMapEmbedUrl(spots, destination)}
              className="w-full"
              style={{ height: "260px", border: 0 }}
              allowFullScreen
              loading="lazy"
              title={`${destination}のスポット地図`}
            />
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            {spots.length >= 2 ? "選択スポットの経路・位置関係を表示中" : "選択スポットの位置を表示中"}
          </p>
        </div>
      )}

      {/* スポット一覧 */}
      <main className="flex-1 px-4 py-4 pb-44 space-y-6">
        {spots.length === 0 ? (
          <div className="text-center py-16">
            <ListChecks className="h-14 w-14 mx-auto mb-4 text-[#3C237D]/20" />
            <p className="text-sm font-medium text-gray-500 mb-4">追加済みのスポットがありません</p>
            <button onClick={handleAddMore}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}>
              スポットを探す
            </button>
          </div>
        ) : (
          grouped.map(({ catName, spots: cs }) => (
            <section key={catName}>
              <h2 className="text-[13px] font-semibold text-[#3C237D] mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3C237D]" />{catName}
                <span className="text-muted-foreground font-normal text-xs normal-case ml-1">（{cs.length}件）</span>
              </h2>
              <div className="space-y-3">
                {cs.map((spot) => (
                  <PlanSpotCard key={spot.id} spot={spot} destination={destination} onRemove={() => removeSpot(spot.id)} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* フッター — BottomNav(64px)の上 */}
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE] z-40 space-y-2"
        style={{ bottom: "64px", boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}>

        {/* 共有ボタン（サブ） */}
        <button onClick={handleShare}
          className="w-full h-10 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-[#3C237D] text-[#3C237D] bg-white active:bg-[#EDE9FE] transition-colors">
          {"share" in navigator ? <><Share2 className="h-4 w-4" />プランを共有</> : <><Copy className="h-4 w-4" />プランをコピー</>}
        </button>

        {/* 次へ（メイン） */}
        <button onClick={goToCityInfo} disabled={spots.length === 0}
          className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: spots.length > 0 ? "0 4px 14px hsl(257 56% 31% / 0.28)" : "none" }}>
          <span>次へ：都市情報を確認</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
