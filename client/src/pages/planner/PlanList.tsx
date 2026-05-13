import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Trash2, Star, Clock, Wallet, Lightbulb,
  Share2, Copy, ListChecks, MapPin,
} from "lucide-react";
import type { Spot, PlanData } from "./TripPlanner";
import { useToast } from "@/hooks/use-toast";

function PlanSpotCard({
  spot,
  onRemove,
}: {
  spot: Spot;
  onRemove: () => void;
}) {
  return (
    <div
      className="rounded-2xl border border-[#EDE9FE] bg-white overflow-hidden"
      style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}
    >
      {/* ヘッダー */}
      <div className="flex items-start gap-2 p-3 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {spot.mustSee && (
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
        <button
          onClick={onRemove}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center active:scale-90 transition-all hover:bg-red-100"
        >
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

export default function PlanList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem("globehub_plan");
    if (!raw) return;
    try {
      const data: PlanData = JSON.parse(raw);
      setPlan(data);
      setSpots(data.spots ?? []);
    } catch { /* ignore */ }
  }, []);

  // スポットを削除してセッションストレージを更新
  const removeSpot = (id: string) => {
    setSpots((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (plan) {
        sessionStorage.setItem("globehub_plan", JSON.stringify({ ...plan, spots: next }));
      }
      return next;
    });
  };

  // カテゴリ別にグループ化
  const grouped: { catName: string; spots: Spot[] }[] = [];
  const seen = new Set<string>();
  for (const spot of spots) {
    const cat = spot.categoryName ?? "その他";
    if (!seen.has(cat)) {
      seen.add(cat);
      grouped.push({ catName: cat, spots: [] });
    }
    grouped.find((g) => g.catName === cat)!.spots.push(spot);
  }

  const handleShare = () => {
    if (!plan || spots.length === 0) return;
    const lines: string[] = [`📍 ${plan.destination}　${plan.dateLabel}\n`];
    for (const { catName, spots: catSpots } of grouped) {
      lines.push(`【${catName}】`);
      catSpots.forEach((s) => {
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
    if (nav.share) {
      nav.share({ title: `${plan.destination}旅行プラン`, text }).catch(() => {});
    } else {
      nav.clipboard?.writeText(text).then(() => toast({ title: "クリップボードにコピーしました" }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ブランドヘッダー */}
      <div
        className="px-4 pt-5 pb-6"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}
      >
        <button
          onClick={() => setLocation("/plan")}
          className="flex items-center gap-1.5 text-white/80 text-sm mb-4 active:opacity-70"
        >
          <ArrowLeft className="h-4 w-4" />スポット検索に戻る
        </button>

        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">プランリスト</h1>
        </div>

        {plan ? (
          <>
            <div className="flex items-center gap-1.5 text-white/80 text-sm mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{plan.destination}</span>
              <span className="mx-1">•</span>
              <span>{plan.dateLabel}</span>
            </div>
            <span className="mt-2 inline-block text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              {spots.length}件のスポット
            </span>
          </>
        ) : (
          <p className="text-white/60 text-sm mt-1">データを読み込み中...</p>
        )}
      </div>

      {/* スポット一覧 */}
      <main className="flex-1 px-4 py-5 pb-36 space-y-7">
        {spots.length === 0 ? (
          <div className="text-center py-16">
            <ListChecks className="h-14 w-14 mx-auto mb-4 text-[#3C237D]/20" />
            <p className="text-sm font-medium text-gray-500">追加済みのスポットがありません</p>
            <button
              onClick={() => setLocation("/plan")}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}
            >
              スポットを探す
            </button>
          </div>
        ) : (
          grouped.map(({ catName, spots: catSpots }) => (
            <section key={catName}>
              <h2 className="text-[13px] font-semibold text-[#3C237D] mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3C237D]" />
                {catName}
                <span className="text-muted-foreground font-normal text-xs normal-case ml-1">
                  （{catSpots.length}件）
                </span>
              </h2>
              <div className="space-y-3">
                {catSpots.map((spot) => (
                  <PlanSpotCard
                    key={spot.id}
                    spot={spot}
                    onRemove={() => removeSpot(spot.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* 共有フッター — BottomNav(64px)の上 */}
      {spots.length > 0 && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE] z-40"
          style={{ bottom: "64px", boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}
        >
          <button
            onClick={handleShare}
            className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}
          >
            {"share" in navigator
              ? <><Share2 className="h-4 w-4" />プランを共有する</>
              : <><Copy className="h-4 w-4" />プランをコピーする</>}
          </button>
        </div>
      )}
    </div>
  );
}
