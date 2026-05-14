import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ChevronRight, MapPin, Loader2,
  Bus, ShieldCheck, Wallet, Zap, BookOpen,
  AlertTriangle, CreditCard, Droplets, Plug, Shirt,
} from "lucide-react";
import type { CityInfoData } from "./PlanList";
import type { PlanData } from "./TripPlanner";

// ── セクション定義 ─────────────────────────────────────────────
const SECTIONS: {
  key: keyof CityInfoData;
  label: string;
  icon: React.ElementType;
  color: string;
  fields: { key: string; label: string; icon: React.ElementType }[];
}[] = [
  {
    key: "transport",
    label: "移動手段（トランスポート）",
    icon: Bus,
    color: "#3B82F6",
    fields: [
      { key: "publicTransit", label: "公共交通の利用法", icon: Bus },
      { key: "passes",        label: "お得なパス・決済",  icon: CreditCard },
    ],
  },
  {
    key: "safety",
    label: "治安（セーフティ）",
    icon: ShieldCheck,
    color: "#EF4444",
    fields: [
      { key: "dangerousAreas",   label: "危険エリア",       icon: AlertTriangle },
      { key: "commonTroubles",   label: "頻出トラブル",     icon: ShieldCheck },
    ],
  },
  {
    key: "money",
    label: "お金とチップ（マネー）",
    icon: Wallet,
    color: "#10B981",
    fields: [
      { key: "payment", label: "決済事情",    icon: CreditCard },
      { key: "tipping", label: "チップの慣習", icon: Wallet },
    ],
  },
  {
    key: "infrastructure",
    label: "生活インフラ（インフラ・マナー）",
    icon: Zap,
    color: "#F59E0B",
    fields: [
      { key: "waterToilet", label: "水・トイレ",   icon: Droplets },
      { key: "powerPlugs",  label: "電源・電圧",   icon: Plug },
    ],
  },
  {
    key: "culture",
    label: "文化とタブー（カルチャー）",
    icon: BookOpen,
    color: "#8B5CF6",
    fields: [
      { key: "mannersAndDress", label: "マナー・服装", icon: Shirt },
      { key: "prohibited",      label: "禁止事項",     icon: AlertTriangle },
    ],
  },
];

// ── スケルトン ─────────────────────────────────────────────────
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

// ── メインページ ─────────────────────────────────────────────
export default function CityInfo() {
  const [, setLocation] = useLocation();
  const [plan, setPlan]         = useState<PlanData | null>(null);
  const [info, setInfo]         = useState<CityInfoData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("globehub_plan");
    if (!raw) { setLoading(false); setError("プランデータが見つかりません"); return; }
    let planData: PlanData;
    try { planData = JSON.parse(raw); setPlan(planData); } catch { setLoading(false); setError("データの読み込みに失敗しました"); return; }

    // キャッシュ確認
    const cached = sessionStorage.getItem("globehub_city_info");
    if (cached) {
      try { setInfo(JSON.parse(cached)); setLoading(false); return; } catch { /* ignore */ }
    }

    // AI から都市情報を取得
    const month = planData.dateLabel
      ? new Date().toLocaleDateString("ja-JP", { month: "long" })
      : undefined;

    fetch("/api/ai/city-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ destination: planData.destination, month }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: CityInfoData) => {
        setInfo(data);
        sessionStorage.setItem("globehub_city_info", JSON.stringify(data));
      })
      .catch(() => setError("都市情報の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  const destination = plan?.destination ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="px-4 pt-5 pb-6"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        <button onClick={() => setLocation("/plan/list")}
          className="flex items-center gap-1.5 text-white/80 text-sm mb-4 active:opacity-70">
          <ArrowLeft className="h-4 w-4" />プランリストに戻る
        </button>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">都市情報</h1>
        </div>
        <div className="flex items-center gap-1.5 text-white/80 text-sm mt-1">
          <MapPin className="w-3.5 h-3.5" />{destination}
          {plan?.dateLabel && <><span className="mx-1">•</span><span>{plan.dateLabel}</span></>}
        </div>
      </div>

      {/* コンテンツ */}
      <main className="flex-1 px-4 py-5 pb-44">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-[#3C237D] mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{destination}の旅行情報を取得しています...</span>
            </div>
            <Skeleton />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">{error}</p>
            <button onClick={() => setLocation("/plan/list")}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-medium border border-[#3C237D] text-[#3C237D]">
              戻る
            </button>
          </div>
        ) : info ? (
          <div className="space-y-4">
            {SECTIONS.map((section) => {
              const sectionData = info[section.key] as Record<string, string>;
              const Icon = section.icon;
              return (
                <div key={section.key}
                  className="rounded-2xl border border-[#EDE9FE] overflow-hidden"
                  style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}>
                  {/* セクションヘッダー */}
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#EDE9FE]"
                    style={{ backgroundColor: section.color + "12" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: section.color + "20" }}>
                      <Icon className="w-4 h-4" style={{ color: section.color }} />
                    </div>
                    <h2 className="text-sm font-bold text-[#1E1B4B]">{section.label}</h2>
                  </div>
                  {/* フィールド */}
                  <div className="divide-y divide-[#EDE9FE]/60">
                    {section.fields.map((field) => {
                      const FieldIcon = field.icon;
                      const text = sectionData?.[field.key] ?? "情報なし";
                      return (
                        <div key={field.key} className="px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FieldIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                              {field.label}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </main>

      {/* フッター — BottomNav(64px)の上 */}
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE] z-40"
        style={{ bottom: "64px", boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}>
        <button
          onClick={() => setLocation("/plan/itinerary")}
          disabled={loading || !!error}
          className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: "0 4px 14px hsl(257 56% 31% / 0.28)" }}>
          <span>しおりを作る</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
