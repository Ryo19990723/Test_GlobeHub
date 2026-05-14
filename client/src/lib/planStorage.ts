import type { Spot, PlanData } from "@/pages/planner/TripPlanner";
import type { CityInfoData } from "@/pages/planner/PlanList";

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
