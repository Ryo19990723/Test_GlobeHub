import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Plus, Trash2, MapPin, ChevronRight, Globe, CalendarDays, ArrowLeft,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { nanoid } from "nanoid";
import { useToast } from "@/hooks/use-toast";
import type { TripSetupData, CityEntry, MultiCityPlan } from "./types";
import { SESSION_KEY, savePlanSession, getPlan } from "./types";
import { PlannerProgress } from "./PlannerProgress";

// ── 選択肢 ────────────────────────────────────────────────────
const COMPANION_OPTIONS = [
  { value: "solo",    label: "一人旅",       emoji: "🧳" },
  { value: "couple",  label: "カップル",     emoji: "❤️" },
  { value: "friends", label: "友人グループ", emoji: "👫" },
  { value: "family",  label: "家族（子連れ）",emoji: "👨‍👩‍👧" },
];

function toDateInput(d: Date) { return d.toISOString().split("T")[0]; }
const todayStr = toDateInput(new Date());

function defaultCityEntry(): CityEntry {
  const start = new Date(); start.setDate(start.getDate() + 30);
  const end   = new Date(start); end.setDate(end.getDate() + 3);
  return { id: nanoid(8), name: "", startDate: toDateInput(start), endDate: toDateInput(end) };
}

// ── 都市エントリー行 ──────────────────────────────────────────
function CityRow({ city, index, total, onChange, onRemove }: {
  city: CityEntry;
  index: number;
  total: number;
  onChange: (c: CityEntry) => void;
  onRemove: () => void;
}) {
  const updateDate = (field: "startDate" | "endDate", val: string) => {
    const updated = { ...city, [field]: val };
    if (field === "startDate" && val > updated.endDate) {
      const e = new Date(val); e.setDate(e.getDate() + 2);
      updated.endDate = toDateInput(e);
    }
    onChange(updated);
  };

  return (
    <div className="rounded-2xl border border-[#EDE9FE] bg-[#FAF9FF] p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[#3C237D] flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">{index + 1}</span>
        </div>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3C237D]/50 pointer-events-none" />
          <input
            type="text" value={city.name}
            onChange={(e) => onChange({ ...city, name: e.target.value })}
            placeholder={`都市名 ${index + 1}（例: パリ、東京）`}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]"
          />
        </div>
        {total > 1 && (
          <button onClick={onRemove}
            className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 active:scale-90">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">到着日</p>
          <input type="date" value={city.startDate} min={todayStr}
            onChange={(e) => updateDate("startDate", e.target.value)}
            className="w-full h-9 px-2 rounded-lg border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">出発日</p>
          <input type="date" value={city.endDate} min={city.startDate}
            onChange={(e) => updateDate("endDate", e.target.value)}
            className="w-full h-9 px-2 rounded-lg border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
        </div>
      </div>
      {city.startDate && city.endDate && (
        <div className="flex items-center gap-1.5 px-1">
          <CalendarDays className="w-3.5 h-3.5 text-[#3C237D]" />
          <span className="text-xs font-semibold text-[#3C237D]">
            {city.startDate} 〜 {city.endDate}（{Math.max(1, Math.round((new Date(city.endDate).getTime() - new Date(city.startDate).getTime()) / 86400000) + 1)}日間）
          </span>
        </div>
      )}
    </div>
  );
}

// ── メイン ────────────────────────────────────────────────────
export default function TripSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [title, setTitle]         = useState("");
  const [cities, setCities]       = useState<CityEntry[]>([defaultCityEntry()]);
  const [budget, setBudget]       = useState<"budget" | "moderate" | "high">("moderate");
  const [companion, setCompanion] = useState("");

  // 編集モードの場合、既存プランからプリフィル
  useEffect(() => {
    const editFlag = sessionStorage.getItem("globehub_setup_edit") === "true";
    if (!editFlag) return;
    const plan = getPlan();
    if (!plan) return;
    setIsEditMode(true);
    setTitle(plan.setup.title);
    setCities(plan.setup.cities.map(c => ({ ...c }))); // shallow copy for independence
    setBudget(plan.setup.budget);
    setCompanion(plan.setup.companion);
  }, []);

  const addCity = () => setCities((c) => [...c, defaultCityEntry()]);

  const updateCity = (i: number, city: CityEntry) =>
    setCities((c) => c.map((x, idx) => idx === i ? city : x));

  const removeCity = (i: number) =>
    setCities((c) => c.filter((_, idx) => idx !== i));

  const canProceed = title.trim() && cities.every((c) => c.name.trim() && c.startDate && c.endDate);

  const handleNext = () => {
    if (isEditMode) {
      const currentPlan = getPlan();
      if (!currentPlan) return;

      const oldCities = currentPlan.setup.cities;
      const updatedCitiesRecord: MultiCityPlan["cities"] = {};
      let anyDatesReset = false;

      for (const city of cities) {
        const oldCity = oldCities.find((c) => c.id === city.id);
        if (currentPlan.cities[city.id]) {
          const datesChanged = oldCity &&
            (oldCity.startDate !== city.startDate || oldCity.endDate !== city.endDate);
          if (datesChanged) {
            // 日程変更時: dayPlans と accommodations をリセット
            updatedCitiesRecord[city.id] = {
              ...currentPlan.cities[city.id],
              dayPlans: [],
              accommodations: [],
            };
            anyDatesReset = true;
          } else {
            updatedCitiesRecord[city.id] = currentPlan.cities[city.id];
          }
        } else {
          // 新規追加都市
          updatedCitiesRecord[city.id] = { spots: [], customQAs: [], dayPlans: [], accommodations: [] };
        }
      }

      const updatedPlan: MultiCityPlan = {
        ...currentPlan,
        setup: { title: title.trim(), cities, budget, companion },
        cities: updatedCitiesRecord,
        currentCityIndex: 0,
      };

      sessionStorage.removeItem("globehub_setup_edit");
      savePlanSession(updatedPlan);

      if (anyDatesReset) {
        toast({ title: "日程データをリセットしました", description: "日付が変更された都市の日程を再設定してください" });
      }
      setLocation("/plan/day-planner");
      return;
    }

    // 新規プラン
    const setup: TripSetupData = { title: title.trim(), cities, budget, companion };
    const plan: MultiCityPlan = {
      version: "v2",
      id: nanoid(12),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      setup,
      currentCityIndex: 0,
      cities: Object.fromEntries(cities.map((c) => [c.id, {
        spots: [], customQAs: [], dayPlans: [], accommodations: [],
      }])),
      transports: [],
    };
    savePlanSession(plan);
    setLocation("/plan/spots");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ヘッダー */}
      <div className="px-4 pt-5 pb-6"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        {isEditMode && (
          <button onClick={() => { sessionStorage.removeItem("globehub_setup_edit"); setLocation("/plan/day-planner"); }}
            className="flex items-center gap-1.5 text-white/80 text-sm mb-4 active:opacity-70">
            <ArrowLeft className="h-4 w-4" />日程設定に戻る
          </button>
        )}
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">
            {isEditMode ? "旅行計画を編集" : "旅行計画 — 基本設定"}
          </h1>
        </div>
        <p className="text-sm text-white/70">旅のタイトルと行き先を設定します</p>
      </div>
      {!isEditMode && <PlannerProgress step={1} />}

      <main className="flex-1 px-4 py-5 pb-32 space-y-5">
        {/* 旅のタイトル */}
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold text-[#1E1B4B]">旅のタイトル</Label>
          <input
            type="text" value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: ヨーロッパ周遊 2025夏"
            className="w-full h-12 px-4 rounded-xl border border-[#EDE9FE] bg-[#FAF9FF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]"
          />
        </div>

        {/* 都市と日程 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[13px] font-semibold text-[#1E1B4B]">行き先と滞在日程</Label>
            <button onClick={addCity}
              className="flex items-center gap-1 text-xs font-semibold text-[#3C237D] border border-[#3C237D]/40 px-2.5 py-1 rounded-full active:bg-[#EDE9FE]">
              <Plus className="w-3.5 h-3.5" />都市を追加
            </button>
          </div>
          <div className="space-y-3">
            {cities.map((c, i) => (
              <CityRow key={c.id} city={c} index={i} total={cities.length}
                onChange={(nc) => updateCity(i, nc)}
                onRemove={() => removeCity(i)} />
            ))}
          </div>
        </div>

        {/* 予算感 */}
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold text-[#1E1B4B]">予算感</Label>
          <div className="flex gap-2">
            {(["budget","moderate","high"] as const).map((b) => (
              <button key={b} onClick={() => setBudget(b)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  budget === b ? "bg-[#3C237D] text-white border-[#3C237D]" : "bg-white text-gray-600 border-gray-200"
                }`}>
                {b === "budget" ? "節約" : b === "moderate" ? "標準" : "余裕あり"}
              </button>
            ))}
          </div>
        </div>

        {/* 同行者 */}
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold text-[#1E1B4B]">今回の同行者</Label>
          <div className="grid grid-cols-2 gap-2">
            {COMPANION_OPTIONS.map((c) => (
              <button key={c.value}
                onClick={() => setCompanion(companion === c.value ? "" : c.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                  companion === c.value
                    ? "border-[#3C237D] bg-[#3C237D]/5 text-[#3C237D] font-medium"
                    : "border-gray-200 text-gray-700"
                }`}>
                <span>{c.emoji}</span>{c.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* フッター */}
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE] z-40"
        style={{ bottom: "64px", boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}>
        <button onClick={handleNext} disabled={!canProceed}
          className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: canProceed ? "0 4px 14px hsl(257 56% 31% / 0.28)" : "none" }}>
          {isEditMode ? "変更を保存して日程設定へ" : "次へ：スポットを探す"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
