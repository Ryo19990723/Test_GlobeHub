import type { CityInfoData } from "./PlanList";

// ── 都市エントリー ───────────────────────────────────────────
export interface CityEntry {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

// ── トリップ設定 ─────────────────────────────────────────────
export interface TripSetupData {
  title: string;
  cities: CityEntry[];
  budget: "budget" | "moderate" | "high";
  companion: string;
}

// ── スポットインスタンス（同じスポットを複数追加可） ──────────
export interface PlannedSpotInstance {
  instanceId: string;  // ユニークID（重複追加対応）
  spot: import("./TripPlanner").Spot;
}

// ── 宿泊施設 ─────────────────────────────────────────────────
export interface Accommodation {
  id: string;
  name: string;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

// ── 1日の計画 ───────────────────────────────────────────────
export interface DayPlanEntry {
  date: string;    // YYYY-MM-DD
  cityId: string;
  instances: PlannedSpotInstance[];
}

// ── AI Q&A ────────────────────────────────────────────────
export interface CustomQA {
  id: string;
  question: string;
  answer: string;
}

// ── 都市ごとのプランデータ ────────────────────────────────────
export interface CityPlanData {
  spots: import("./TripPlanner").Spot[];
  cityInfo?: CityInfoData;
  customQAs: CustomQA[];
  dayPlans: DayPlanEntry[];
  accommodations: Accommodation[];
}

// ── 都市間移動 ───────────────────────────────────────────────
export interface CityTransport {
  fromCityId: string;
  toCityId: string;
  mode: string;             // 飛行機 / 電車 / バス / 車 / フェリー / その他
  duration: string;
  bookingNote: string;
  operator?: string;        // 運航会社名
  serviceNumber?: string;   // 便名・列車名
  departurePlace?: string;  // 出発場所
  arrivalPlace?: string;    // 到着場所
  departureTime?: string;   // 出発時間 HH:MM
  arrivalTime?: string;     // 到着時間 HH:MM
  bookingStatus?: "booked" | "not_booked" | "not_required";
}

// ── マルチシティプラン（全体） ────────────────────────────────
export interface MultiCityPlan {
  version: "v2";
  id: string;
  createdAt: string;
  updatedAt: string;
  setup: TripSetupData;
  currentCityIndex: number;
  cities: Record<string, CityPlanData>;
  transports: CityTransport[];
}

// ── sessionStorage / localStorage キー ──────────────────────
export const SESSION_KEY = "globehub_multiplan";
const DRAFT_KEY = "globehub_multiplan_draft";

// ── ユーティリティ ───────────────────────────────────────────
export function getPlan(): MultiCityPlan | null {
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (s) return JSON.parse(s);
    // ページリロードでセッションが消えた場合はlocalStorageのドラフトから復元
    const d = localStorage.getItem(DRAFT_KEY);
    if (d) { sessionStorage.setItem(SESSION_KEY, d); return JSON.parse(d); }
    return null;
  } catch { return null; }
}

export function savePlanSession(plan: MultiCityPlan) {
  plan.updatedAt = new Date().toISOString();
  const json = JSON.stringify(plan);
  sessionStorage.setItem(SESSION_KEY, json);
  try { localStorage.setItem(DRAFT_KEY, json); } catch { /* storage full は無視 */ }
}

export function clearPlanDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export function currentCity(plan: MultiCityPlan): CityEntry | undefined {
  return plan.setup.cities[plan.currentCityIndex];
}

/** YYYY-MM-DD の範囲内の全日付を配列で返す */
export function datesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export function fmtDateJa(date: string): string {
  return new Date(date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}

export function calcDaysCount(start: string, end: string): number {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}
