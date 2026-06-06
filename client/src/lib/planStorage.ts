import type { Spot, PlanData } from "@/pages/planner/TripPlanner";
import type { CityInfoData } from "@/pages/planner/PlanList";
import type { MultiCityPlan, CityEntry } from "@/pages/planner/types";

export type PlanStatus = "draft" | "completed";

export interface SavedPlan {
  id: string;
  createdAt: string;
  updatedAt: string;
  destination: string;
  dateLabel: string;
  spots: Spot[];
  cityInfo?: CityInfoData;
  status: PlanStatus;
}

const KEY = "globehub_plans";

export function getSavedPlans(): SavedPlan[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

export function upsertPlan(
  plan: PlanData,
  cityInfo?: CityInfoData,
  existingId?: string
): SavedPlan {
  const plans = getSavedPlans();
  const now = new Date().toISOString();
  const idx = existingId ? plans.findIndex((p) => p.id === existingId) : -1;

  const saved: SavedPlan = {
    id: idx >= 0 ? plans[idx].id : `plan_${Date.now()}`,
    createdAt: idx >= 0 ? plans[idx].createdAt : now,
    updatedAt: now,
    destination: plan.destination,
    dateLabel: plan.dateLabel,
    spots: plan.spots,
    ...(cityInfo ? { cityInfo } : idx >= 0 && plans[idx].cityInfo ? { cityInfo: plans[idx].cityInfo } : {}),
    status: (cityInfo ? "completed" : (idx >= 0 ? plans[idx].status : "draft")) as PlanStatus,
  };

  if (idx >= 0) { plans[idx] = saved; } else { plans.unshift(saved); }
  localStorage.setItem(KEY, JSON.stringify(plans.slice(0, 30)));
  return saved;
}

export function markCompleted(id: string, cityInfo: CityInfoData) {
  const plans = getSavedPlans();
  const idx = plans.findIndex((p) => p.id === id);
  if (idx >= 0) {
    plans[idx].cityInfo = cityInfo;
    plans[idx].status = "completed";
    plans[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(plans));
  }
}

export function deletePlan(id: string) {
  localStorage.setItem(KEY, JSON.stringify(getSavedPlans().filter((p) => p.id !== id)));
}

export function restorePlan(plan: SavedPlan) {
  const planData: PlanData = {
    destination: plan.destination,
    dateLabel: plan.dateLabel,
    spots: plan.spots,
  };
  sessionStorage.setItem("globehub_plan", JSON.stringify(planData));
  sessionStorage.setItem("globehub_plan_id", plan.id);
  if (plan.cityInfo) sessionStorage.setItem("globehub_city_info", JSON.stringify(plan.cityInfo));
  else sessionStorage.removeItem("globehub_city_info");
}

// ── マルチシティプラン ─────────────────────────────────────────

export interface SavedMultiCityPlan {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  cities: Pick<CityEntry, "id" | "name" | "startDate" | "endDate">[];
  status: PlanStatus;
  planData: MultiCityPlan;
}

const MULTI_KEY = "globehub_multi_plans";

export function getMultiCityPlans(): SavedMultiCityPlan[] {
  try { return JSON.parse(localStorage.getItem(MULTI_KEY) ?? "[]"); }
  catch { return []; }
}

export function saveMultiCityPlan(plan: MultiCityPlan): SavedMultiCityPlan {
  const plans = getMultiCityPlans();
  const now = new Date().toISOString();
  const idx = plans.findIndex((p) => p.id === plan.id);

  const saved: SavedMultiCityPlan = {
    id: plan.id,
    createdAt: idx >= 0 ? plans[idx].createdAt : now,
    updatedAt: now,
    title: plan.setup.title,
    cities: plan.setup.cities.map(({ id, name, startDate, endDate }) => ({ id, name, startDate, endDate })),
    status: "completed",
    planData: plan,
  };

  if (idx >= 0) { plans[idx] = saved; } else { plans.unshift(saved); }
  localStorage.setItem(MULTI_KEY, JSON.stringify(plans.slice(0, 30)));
  return saved;
}

export function deleteMultiCityPlan(id: string) {
  localStorage.setItem(MULTI_KEY, JSON.stringify(getMultiCityPlans().filter((p) => p.id !== id)));
}

export function restoreMultiCityPlan(saved: SavedMultiCityPlan) {
  sessionStorage.setItem("globehub_multiplan", JSON.stringify(saved.planData));
}
