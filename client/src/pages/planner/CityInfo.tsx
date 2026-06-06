import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ChevronRight, MapPin, Loader2, RefreshCw,
  Bus, ShieldCheck, Wallet, Zap, BookOpen,
  AlertTriangle, CreditCard, Droplets, Plug, Shirt,
  MessageCirclePlus, Send, ChevronDown, ChevronUp,
} from "lucide-react";
import type { CityInfoData } from "./PlanList";
import { getPlan, savePlanSession, currentCity } from "./types";
import { nanoid } from "nanoid";
import type { CustomQA } from "./types";
import { PlannerProgress } from "./PlannerProgress";

const SECTIONS: {
  key: keyof CityInfoData;
  label: string;
  icon: React.ElementType;
  color: string;
  fields: { key: string; label: string; icon: React.ElementType }[];
}[] = [
  { key: "transport",      label: "移動手段（トランスポート）",    icon: Bus,        color: "#3B82F6",
    fields: [{ key: "publicTransit", label: "公共交通の利用法", icon: Bus }, { key: "passes", label: "お得なパス", icon: CreditCard }] },
  { key: "safety",         label: "治安（セーフティ）",           icon: ShieldCheck,color: "#EF4444",
    fields: [{ key: "dangerousAreas", label: "危険エリア", icon: AlertTriangle }, { key: "commonTroubles", label: "頻出トラブル", icon: ShieldCheck }] },
  { key: "money",          label: "お金とチップ（マネー）",        icon: Wallet,     color: "#10B981",
    fields: [{ key: "payment", label: "決済事情", icon: CreditCard }, { key: "tipping", label: "チップの慣習", icon: Wallet }] },
  { key: "infrastructure", label: "生活インフラ（インフラ・マナー）",icon: Zap,       color: "#F59E0B",
    fields: [{ key: "waterToilet", label: "水とトイレ", icon: Droplets }, { key: "powerPlugs", label: "電源・電圧", icon: Plug }] },
  { key: "culture",        label: "文化とタブー（カルチャー）",    icon: BookOpen,   color: "#8B5CF6",
    fields: [{ key: "mannersAndDress", label: "マナーと服装", icon: Shirt }, { key: "prohibited", label: "禁止事項", icon: AlertTriangle }] },
];

function Skeleton() {
  return (
    <div className="space-y-4">
      {SECTIONS.map((s) => (
        <div key={s.key} className="rounded-2xl border border-[#EDE9FE] p-4 space-y-3">
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-4/5 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function CityInfo() {
  const [, setLocation] = useLocation();
  const [plan, setPlan] = useState(() => getPlan());
  const city = plan ? currentCity(plan) : undefined;

  const [info, setInfo]         = useState<CityInfoData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [qaList, setQaList]     = useState<CustomQA[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking]     = useState(false);
  const [showQA, setShowQA]     = useState(false);

  const fetchCityInfo = useCallback((forceRefresh = false) => {
    const currentPlan = getPlan();
    const currentCityEntry = currentPlan ? currentCity(currentPlan) : undefined;
    if (!currentPlan || !currentCityEntry) { setLoading(false); setError("旅行設定が見つかりません"); return; }
    setPlan(currentPlan);

    const existingQAs = currentPlan.cities[currentCityEntry.id]?.customQAs ?? [];
    setQaList(existingQAs);

    if (!forceRefresh) {
      const existingInfo = currentPlan.cities[currentCityEntry.id]?.cityInfo;
      const hasContent = existingInfo && typeof existingInfo.transport === "object" && existingInfo.transport !== null;
      if (hasContent) { setInfo(existingInfo!); setLoading(false); return; }
    }

    setLoading(true); setError("");
    const month = new Date(currentCityEntry.startDate).toLocaleDateString("ja-JP", { month: "long" });
    fetch("/api/ai/city-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ destination: currentCityEntry.name, month }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: CityInfoData) => {
        if (!data || typeof data.transport !== "object" || data.transport === null) {
          setError("都市情報の取得に失敗しました");
          return;
        }
        setInfo(data);
        const updated = { ...currentPlan };
        if (!updated.cities[currentCityEntry.id])
          updated.cities[currentCityEntry.id] = { spots: [], customQAs: [], dayPlans: [], accommodations: [] };
        updated.cities[currentCityEntry.id].cityInfo = data;
        savePlanSession(updated);
        setPlan(updated);
      })
      .catch(() => setError("都市情報の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCityInfo(false); }, [fetchCityInfo]);

  const handleAsk = async () => {
    if (!question.trim() || !city) return;
    // 重複質問チェック
    const trimmed = question.trim();
    if (qaList.some((qa) => qa.question === trimmed)) {
      setQuestion("");
      return;
    }
    setAsking(true);
    try {
      const currentPlan = getPlan();
      const res = await fetch("/api/ai/ask-city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ destination: city.name, question: trimmed }),
      });
      const data = await res.json();
      const qa: CustomQA = { id: nanoid(8), question: trimmed, answer: data.answer ?? "回答を取得できませんでした" };
      const newList = [...qaList, qa];
      setQaList(newList);
      setQuestion("");
      if (currentPlan && city) {
        const updated = { ...currentPlan };
        if (!updated.cities[city.id]) updated.cities[city.id] = { spots: [], customQAs: [], dayPlans: [], accommodations: [] };
        updated.cities[city.id].customQAs = newList;
        savePlanSession(updated);
        setPlan(updated);
      }
    } catch { /* ignore */ }
    finally { setAsking(false); }
  };

  const isLastCity = plan ? plan.currentCityIndex >= plan.setup.cities.length - 1 : true;
  const nextCityName = plan && !isLastCity ? plan.setup.cities[plan.currentCityIndex + 1].name : "";

  const handleNext = () => {
    if (!plan || !city) return;
    const updated = { ...plan };
    if (!updated.cities[city.id]) updated.cities[city.id] = { spots: [], customQAs: [], dayPlans: [], accommodations: [] };
    if (info) updated.cities[city.id].cityInfo = info;
    updated.cities[city.id].customQAs = qaList;
    // DayPlannerから「スポットを追加」で来た場合は常にDayPlannerに戻る
    const returnToDayPlanner = sessionStorage.getItem("globehub_day_planner_return") === "true";
    if (returnToDayPlanner) {
      sessionStorage.removeItem("globehub_day_planner_return");
      savePlanSession(updated);
      setLocation("/plan/day-planner");
      return;
    }
    if (isLastCity) {
      savePlanSession(updated);
      setLocation("/plan/day-planner");
    } else {
      updated.currentCityIndex = plan.currentCityIndex + 1;
      savePlanSession(updated);
      setLocation("/plan/spots");
    }
  };

  const destination = city?.name ?? "";

  const cityIndex = plan?.currentCityIndex ?? 0;
  const totalCities = plan?.setup.cities.length ?? 1;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="px-4 pt-5 pb-6"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        <button onClick={() => setLocation("/plan/spots")}
          className="flex items-center gap-1.5 text-white/80 text-sm mb-4 active:opacity-70">
          <ArrowLeft className="h-4 w-4" />スポット検索に戻る
        </button>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">{destination}の都市情報</h1>
        </div>
        {city && <p className="text-sm text-white/70">{city.startDate} 〜 {city.endDate}</p>}
      </div>
      <PlannerProgress step={3} cityIndex={cityIndex} totalCities={totalCities} />

      <main className="flex-1 px-4 py-5 pb-44">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-[#3C237D] mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />{destination}の旅行情報を取得中...
            </div>
            <Skeleton />
          </div>
        ) : error ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={() => fetchCityInfo(true)}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}>
              <RefreshCw className="w-4 h-4" />再試行する
            </button>
          </div>
        ) : info ? (
          <div className="space-y-4">
            {SECTIONS.map((section) => {
              const sectionData = info[section.key] as Record<string, string>;
              const Icon = section.icon;
              return (
                <div key={section.key} className="rounded-2xl border border-[#EDE9FE] overflow-hidden"
                  style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}>
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#EDE9FE]"
                    style={{ backgroundColor: section.color + "12" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: section.color + "20" }}>
                      <Icon className="w-4 h-4" style={{ color: section.color }} />
                    </div>
                    <h2 className="text-sm font-bold text-[#1E1B4B]">{section.label}</h2>
                  </div>
                  <div className="divide-y divide-[#EDE9FE]/60">
                    {section.fields.map((field) => {
                      const FieldIcon = field.icon;
                      return (
                        <div key={field.key} className="px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FieldIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</p>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{sectionData?.[field.key] ?? ""}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* AI Q&A セクション */}
            <div className="rounded-2xl border border-[#EDE9FE] overflow-hidden"
              style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}>
              <button className="w-full flex items-center justify-between px-4 py-3 border-b border-[#EDE9FE] bg-[#3C237D]/5"
                onClick={() => setShowQA((v) => !v)}>
                <div className="flex items-center gap-2">
                  <MessageCirclePlus className="w-4 h-4 text-[#3C237D]" />
                  <span className="text-sm font-bold text-[#1E1B4B]">その他 — AIに質問する</span>
                  {qaList.length > 0 && (
                    <span className="text-xs bg-[#3C237D] text-white px-1.5 py-0.5 rounded-full">{qaList.length}</span>
                  )}
                </div>
                {showQA ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {showQA && (
                <div className="p-4 space-y-4">
                  {/* Q&Aリスト */}
                  {qaList.map((qa) => (
                    <div key={qa.id} className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-[#3C237D] bg-[#EDE9FE] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">Q</span>
                        <p className="text-xs font-semibold text-[#1E1B4B]">{qa.question}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">A</span>
                        <p className="text-xs text-gray-700 leading-relaxed">{qa.answer}</p>
                      </div>
                    </div>
                  ))}

                  {/* 質問入力 */}
                  <div className="flex gap-2">
                    <input
                      type="text" value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                      placeholder={`${destination}について知りたいことを入力…`}
                      className="flex-1 h-10 px-3 rounded-xl border border-[#EDE9FE] bg-[#FAF9FF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]"
                      disabled={asking}
                    />
                    <button onClick={handleAsk} disabled={asking || !question.trim()}
                      className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-90 flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}>
                      {asking ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">回答はしおりの「その他の情報」欄に追加されます</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE] z-40"
        style={{ bottom: "64px", boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}>
        <button onClick={handleNext} disabled={loading || !!error}
          className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: "0 4px 14px hsl(257 56% 31% / 0.28)" }}>
          {isLastCity ? `日程を組む` : `次へ：${nextCityName}のスポットを探す`}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
