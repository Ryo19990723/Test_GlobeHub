import type { SavedMultiCityPlan } from "@/lib/planStorage";
import type { CityPlanData } from "../planner/types";

// ── データ型 ──────────────────────────────────────────────────

export interface SpotRecord {
  visited: boolean;
  rating: number;       // 0=未評価, 1-5
  impression: string;
}

export interface ExtraSpot {
  name: string;
  category: string;
  rating: number;
  impression: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface SummaryFields {
  safetyTips: string;
  transportTips: string;
  travelTips: string;
  memorableMoment: string;
}

export interface CityRecord {
  // planSpotId or "extra:xxx" - これが表示順序の唯一の情報源
  unifiedOrder: string[];
  spotRecords: Record<string, SpotRecord>;    // planSpotId → 評価
  extraSpotData: Record<string, ExtraSpot>;  // "extra:xxx" → データ
  summary: SummaryFields;
}

export interface PlanRecord {
  planId: string;
  planTitle: string;
  updatedAt: string;
  cities: Record<string, CityRecord>;
}

// ── localStorage ─────────────────────────────────────────────

const RECORD_KEY = "globehub_plan_records";

export function getAllPlanRecords(): Record<string, PlanRecord> {
  try { return JSON.parse(localStorage.getItem(RECORD_KEY) ?? "{}"); }
  catch { return {}; }
}

export function getPlanRecord(planId: string): PlanRecord | null {
  return getAllPlanRecords()[planId] ?? null;
}

export function savePlanRecord(record: PlanRecord): void {
  const all = getAllPlanRecords();
  record.updatedAt = new Date().toISOString();
  all[record.planId] = record;
  localStorage.setItem(RECORD_KEY, JSON.stringify(all));
}

// ── 初期化 ────────────────────────────────────────────────────

export function buildInitialOrder(cityData: CityPlanData | undefined): string[] {
  if (!cityData) return [];
  const ordered: string[] = [];
  const seen = new Set<string>();

  // 日程プランから順番を引き継ぐ（日付昇順）
  const sorted = [...(cityData.dayPlans ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  for (const dp of sorted) {
    for (const inst of dp.instances) {
      if (!seen.has(inst.spot.id)) {
        ordered.push(inst.spot.id);
        seen.add(inst.spot.id);
      }
    }
  }
  // 日程未割当のスポットを後ろに追加
  for (const spot of cityData.spots ?? []) {
    if (!seen.has(spot.id)) {
      ordered.push(spot.id);
      seen.add(spot.id);
    }
  }
  return ordered;
}

export function initPlanRecord(plan: SavedMultiCityPlan): PlanRecord {
  const existing = getPlanRecord(plan.id);
  if (existing) return existing;

  const cities: Record<string, CityRecord> = {};
  for (const city of plan.cities) {
    const cityData = plan.planData.cities[city.id];
    cities[city.id] = {
      unifiedOrder: buildInitialOrder(cityData),
      spotRecords: {},
      extraSpotData: {},
      summary: { safetyTips: "", transportTips: "", travelTips: "", memorableMoment: "" },
    };
  }

  const record: PlanRecord = {
    planId: plan.id,
    planTitle: plan.title,
    updatedAt: new Date().toISOString(),
    cities,
  };
  savePlanRecord(record);
  return record;
}

// ── ユーティリティ ────────────────────────────────────────────

export function hasCityData(cityRecord: CityRecord): boolean {
  if (Object.values(cityRecord.summary).some((v) => v.trim())) return true;
  return cityRecord.unifiedOrder.some((id) => {
    if (id.startsWith("extra:")) {
      const e = cityRecord.extraSpotData[id];
      return e && (e.name || e.rating || e.impression);
    }
    const r = cityRecord.spotRecords[id];
    return r && (r.visited || r.rating || r.impression);
  });
}

export const PLAN_CATEGORIES = [
  { value: "sightseeing", label: "観光・文化" },
  { value: "gourmet",     label: "グルメ" },
  { value: "nature",      label: "自然・絶景" },
  { value: "experience",  label: "体験・アクティビティ" },
  { value: "street",      label: "街並み・ローカル" },
  { value: "hotel",       label: "宿泊" },
  { value: "transport",   label: "交通" },
  { value: "other",       label: "その他" },
] as const;

export const SUMMARY_STEPS = [
  { key: "safetyTips" as const,      label: "安全に旅するためのポイント",     hint: "治安、気をつけるべきエリア、注意事項など" },
  { key: "transportTips" as const,   label: "移動手段のポイント",            hint: "交通手段、料金の目安、便利な移動方法など" },
  { key: "travelTips" as const,      label: "次の旅人に伝えたいコツ・注意点", hint: "役立つ情報、おすすめの過ごし方、失敗談など" },
  { key: "memorableMoment" as const, label: "心に残った瞬間",               hint: "一番印象に残ったシーン、感動した瞬間など" },
] as const;
