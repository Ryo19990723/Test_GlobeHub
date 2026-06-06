import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, CalendarDays, ChevronRight, Globe, Sparkles } from "lucide-react";
import { getMultiCityPlans, type SavedMultiCityPlan } from "@/lib/planStorage";
import { initPlanRecord } from "./planRecordStorage";

export default function PlanToRecord() {
  const [, setLocation] = useLocation();
  const [plans, setPlans] = useState<SavedMultiCityPlan[]>([]);

  useEffect(() => {
    setPlans(getMultiCityPlans());
  }, []);

  const handleSelect = (plan: SavedMultiCityPlan) => {
    initPlanRecord(plan); // 既存レコードがなければ初期化
    setLocation(`/record/plan/${plan.id}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-4 pt-5 pb-6"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        <button onClick={() => setLocation("/record")}
          className="flex items-center gap-1.5 text-white/80 text-sm mb-4 active:opacity-70">
          <ArrowLeft className="h-4 w-4" />記録ホームに戻る
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">旅行計画から記録する</h1>
        </div>
        <p className="text-sm text-white/70">完成した旅行計画を元に旅の記録を作ります</p>
      </div>

      <main className="flex-1 px-4 py-5 pb-24">
        {plans.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Globe className="w-12 h-12 text-[#3C237D]/20 mx-auto" />
            <p className="text-sm font-medium text-gray-500">保存済みの旅行計画がありません</p>
            <p className="text-xs text-muted-foreground">旅行計画を作成・完成させると<br />ここに表示されます</p>
            <button onClick={() => setLocation("/trip-planner")}
              className="mt-2 text-sm font-semibold text-[#3C237D] underline underline-offset-2">
              旅行計画を作る
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-muted-foreground mb-1">記録する旅行計画を選んでください</p>
            {plans.map((plan) => {
              const firstCity = plan.cities[0];
              const lastCity = plan.cities[plan.cities.length - 1];
              const totalSpots = Object.values(plan.planData.cities)
                .reduce((acc, c) => acc + c.spots.length, 0);
              const previewPhoto = Object.values(plan.planData.cities)
                .flatMap((c) => c.spots)
                .find((s) => s.photoUrl)?.photoUrl;

              return (
                <button key={plan.id} onClick={() => handleSelect(plan)}
                  className="w-full rounded-2xl border border-[#EDE9FE] bg-white overflow-hidden text-left active:scale-[0.98] transition-all"
                  style={{ boxShadow: "0 2px 12px hsl(257 56% 31% / 0.08)" }}>
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/6" }}>
                    {previewPhoto ? (
                      <img src={previewPhoto} alt={plan.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #3C237D22 0%, #5B3FAF22 100%)" }}>
                        <Globe className="w-8 h-8 text-[#3C237D]/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute bottom-2.5 left-3 right-3">
                      <h3 className="text-sm font-bold text-white drop-shadow">{plan.title}</h3>
                      <p className="text-xs text-white/80">
                        {firstCity?.startDate} 〜 {lastCity?.endDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Globe className="w-3.5 h-3.5" />{plan.cities.length}都市
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />{totalSpots}スポット
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {new Date(plan.updatedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#3C237D]" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
