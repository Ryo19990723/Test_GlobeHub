import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  PlusCircle, MapPin, Clock, CheckCircle2, FileEdit,
  Trash2, ChevronRight, Sparkles, CalendarDays,
} from "lucide-react";
import { getSavedPlans, deletePlan, restorePlan, type SavedPlan } from "@/lib/planStorage";

function PlanCard({ plan, onEdit, onDelete }: {
  plan: SavedPlan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const previewPhoto = plan.spots.find((s) => s.photoUrl)?.photoUrl;
  const isCompleted = plan.status === "completed";

  return (
    <div
      className="rounded-2xl border border-[#EDE9FE] bg-white overflow-hidden"
      style={{ boxShadow: "0 2px 12px hsl(257 56% 31% / 0.08)" }}
    >
      {/* 写真ヘッダー */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/7" }}>
        {previewPhoto ? (
          <img src={previewPhoto} alt={plan.destination}
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3C237D22 0%, #5B3FAF22 100%)" }}>
            <MapPin className="w-10 h-10 text-[#3C237D]/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {/* ステータスバッジ */}
        <span className={`absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          isCompleted
            ? "bg-green-500 text-white"
            : "bg-amber-400 text-white"
        }`}>
          {isCompleted
            ? <><CheckCircle2 className="w-2.5 h-2.5" />完成</>
            : <><FileEdit className="w-2.5 h-2.5" />下書き</>}
        </span>
        {/* 目的地 */}
        <div className="absolute bottom-2.5 left-3 right-3">
          <h3 className="text-base font-bold text-white drop-shadow leading-tight">{plan.destination}</h3>
          <p className="text-xs text-white/80 mt-0.5">{plan.dateLabel}</p>
        </div>
      </div>

      {/* メタ情報 */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[#EDE9FE]/60">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />{plan.spots.length}件のスポット
        </span>
        {plan.cityInfo && (
          <span className="flex items-center gap-1 text-xs text-[#3C237D]/70">
            <Sparkles className="w-3 h-3" />都市情報あり
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
          <CalendarDays className="w-3 h-3" />
          {new Date(plan.updatedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}更新
        </span>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 px-3 py-2.5">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}
        >
          <FileEdit className="w-3.5 h-3.5" />編集・確認
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center active:scale-90 transition-all"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}

export default function TripPlannerHome() {
  const [, setLocation] = useLocation();
  const [plans, setPlans] = useState<SavedPlan[]>([]);

  useEffect(() => {
    setPlans(getSavedPlans());
  }, []);

  const handleNewPlan = () => {
    sessionStorage.removeItem("globehub_plan");
    sessionStorage.removeItem("globehub_city_info");
    sessionStorage.removeItem("globehub_plan_id");
    sessionStorage.removeItem("globehub_plan_append");
    setLocation("/plan");
  };

  const handleEdit = (plan: SavedPlan) => {
    restorePlan(plan);
    setLocation("/plan/list");
  };

  const handleDelete = (id: string) => {
    deletePlan(id);
    setPlans(getSavedPlans());
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ヘッダー */}
      <div className="px-4 pt-5 pb-6"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">旅行計画</h1>
        </div>
        <p className="text-sm text-white/70 mt-0.5">AIが旅程を提案します</p>
      </div>

      <main className="flex-1 px-4 py-5 pb-24">
        {/* 新規作成ボタン */}
        <button
          onClick={handleNewPlan}
          className="w-full flex items-center justify-between px-4 py-4 rounded-2xl mb-6 active:scale-[0.98] transition-all"
          style={{
            background: "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
            boxShadow: "0 6px 20px rgba(249, 115, 22, 0.28)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold text-white leading-tight">新しい旅行計画を作る</p>
              <p className="text-xs text-white/75 mt-0.5">AIがスポットを提案します</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/70" />
        </button>

        {/* 保存済みプラン一覧 */}
        {plans.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-[#3C237D]/40" />
            </div>
            <p className="text-sm font-medium text-gray-500">保存済みの旅行計画はありません</p>
            <p className="text-xs text-muted-foreground mt-1">
              新しい旅行計画を作ると<br />ここに保存されます
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[15px] font-semibold text-[#1E1B4B]">保存済みの旅行計画</h2>
              <span className="text-xs text-muted-foreground">{plans.length}件</span>
            </div>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => handleEdit(plan)}
                onDelete={() => handleDelete(plan.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
