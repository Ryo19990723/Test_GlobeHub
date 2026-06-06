import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ChevronRight, ChevronDown, ChevronUp,
  Plus, X, Hotel, MapPin, Plane, Train, Bus as BusIcon, Car, Ship,
  HelpCircle, Copy, CalendarDays, Globe, Clock, Map, ExternalLink,
  Settings, ArrowRight,
} from "lucide-react";
import {
  getPlan, savePlanSession, datesInRange, fmtDateJa, calcDaysCount,
} from "./types";
import type { MultiCityPlan, PlannedSpotInstance, Accommodation, CityTransport, CityEntry } from "./types";
import { nanoid } from "nanoid";
import type { Spot } from "./TripPlanner";
import { PlannerProgress } from "./PlannerProgress";

// ── 定数 ──────────────────────────────────────────────────────
const PUBLIC_MODES = ["飛行機", "電車", "バス", "フェリー"] as const;
const ALL_MODES = ["飛行機", "電車", "バス", "フェリー", "車", "その他"] as const;
type TransMode = typeof ALL_MODES[number];

const TRANSPORT_ICONS: Record<TransMode, React.ElementType> = {
  "飛行機": Plane, "電車": Train, "バス": BusIcon,
  "フェリー": Ship, "車": Car, "その他": HelpCircle,
};

const BOOKING_LABELS: Record<string, string> = {
  booked: "予約済み ✓",
  not_booked: "予約前",
  not_required: "予約不要",
};

// ── 地図URL ───────────────────────────────────────────────────
function buildMapEmbedUrl(spots: Spot[], dest: string): string {
  const enc = (name: string) => encodeURIComponent(name + " " + dest);
  if (spots.length === 0) return `https://maps.google.com/maps?q=${encodeURIComponent(dest)}&output=embed`;
  if (spots.length === 1) return `https://maps.google.com/maps?q=${enc(spots[0].name)}&output=embed`;
  const origin = enc(spots[0].name);
  const dests = spots.slice(1, 9).map((s) => enc(s.name)).join("+to:");
  return `https://maps.google.com/maps?saddr=${origin}&daddr=${dests}&output=embed`;
}

// ── 所要時間推定 ──────────────────────────────────────────────
function estimateHours(duration: string): number {
  if (!duration) return 0;
  const d = duration.replace(/\s/g, "");
  const hmMatch = d.match(/(\d+)時間(\d+)分/);
  if (hmMatch) return parseInt(hmMatch[1]) + parseInt(hmMatch[2]) / 60;
  const rangeMatch = d.match(/(\d+)[〜~-](\d+)時間/);
  if (rangeMatch) return (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
  const hMatch = d.match(/(\d+(?:\.\d+)?)時間/);
  if (hMatch) return parseFloat(hMatch[1]);
  const mMatch = d.match(/(\d+)分/);
  if (mMatch) return parseInt(mMatch[1]) / 60;
  if (d.includes("半日")) return 4;
  if (d.includes("終日") || d.includes("1日")) return 8;
  return 0;
}

function fmtHours(total: number): string {
  if (total <= 0) return "";
  const h = Math.floor(total);
  const m = Math.round((total - h) * 60);
  if (h === 0) return `約${m}分`;
  if (m === 0) return `約${h}時間`;
  return `約${h}時間${m}分`;
}

// ── ヘルパー ──────────────────────────────────────────────────
function spotInDay(
  dayPlans: MultiCityPlan["cities"][string]["dayPlans"],
  date: string, spotId: string
): boolean {
  return (dayPlans.find((dp) => dp.date === date)?.instances ?? []).some((i) => i.spot.id === spotId);
}

// ── DayPlanner コンポーネント ─────────────────────────────────
export default function DayPlanner() {
  const [, setLocation] = useLocation();
  const [planState, setPlanState] = useState<MultiCityPlan | null>(() => getPlan());
  const [selectedCityIdx, setSelectedCityIdx] = useState(0);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [movingInstance, setMovingInstance] = useState<{ date: string; instanceId: string } | null>(null);

  // 宿泊フォーム
  const [showAddAccom, setShowAddAccom] = useState(false);
  const [accomName, setAccomName] = useState("");
  const [accomCheckIn, setAccomCheckIn] = useState("");
  const [accomCheckOut, setAccomCheckOut] = useState("");

  // 交通フォーム
  const [transFormKey, setTransFormKey] = useState<string | null>(null);
  const [tMode, setTMode] = useState<TransMode>("飛行機");
  const [tDuration, setTDuration] = useState("");
  const [tOperator, setTOperator] = useState("");
  const [tServiceNum, setTServiceNum] = useState("");
  const [tDeptPlace, setTDeptPlace] = useState("");
  const [tArrPlace, setTArrPlace] = useState("");
  const [tDeptTime, setTDeptTime] = useState("");
  const [tArrTime, setTArrTime] = useState("");
  const [tBookingStatus, setTBookingStatus] = useState<"booked" | "not_booked" | "not_required">("not_booked");
  const [tBookingNote, setTBookingNote] = useState("");

  const mutate = (updater: (p: MultiCityPlan) => MultiCityPlan) => {
    setPlanState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      savePlanSession(next);
      return next;
    });
  };

  if (!planState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">旅行設定が見つかりません</p>
      </div>
    );
  }

  const cities = planState.setup.cities;
  const city: CityEntry | undefined = cities[selectedCityIdx];
  if (!city) return null;

  const cityData = planState.cities[city.id];
  const allSpots: Spot[] = cityData?.spots ?? [];
  const dates = datesInRange(city.startDate, city.endDate);
  const dayPlans = cityData?.dayPlans ?? [];
  const accommodations: Accommodation[] = cityData?.accommodations ?? [];

  const getInstances = (date: string): PlannedSpotInstance[] =>
    dayPlans.find((dp) => dp.date === date)?.instances ?? [];

  const getAccomsForDate = (date: string): Accommodation[] =>
    accommodations.filter((a) => a.checkIn <= date && date <= a.checkOut);

  const updateInstances = (date: string, instances: PlannedSpotInstance[]) => {
    mutate((p) => {
      const c = p.setup.cities[selectedCityIdx];
      if (!c || !p.cities[c.id]) return p;
      const dps = [...p.cities[c.id].dayPlans];
      const idx = dps.findIndex((dp) => dp.date === date);
      if (idx >= 0) dps[idx] = { ...dps[idx], instances };
      else dps.push({ date, cityId: c.id, instances });
      return { ...p, cities: { ...p.cities, [c.id]: { ...p.cities[c.id], dayPlans: dps } } };
    });
  };

  // スポットをその日にトグル
  const toggleSpotDay = (spot: Spot, date: string) => {
    const list = getInstances(date);
    const existing = list.filter((i) => i.spot.id === spot.id);
    if (existing.length > 0) updateInstances(date, list.filter((i) => i.spot.id !== spot.id));
    else updateInstances(date, [...list, { instanceId: nanoid(8), spot }]);
  };

  // 日を跨いで移動（アトミック）
  const moveInstanceToDay = (fromDate: string, instanceId: string, toDate: string) => {
    mutate((p) => {
      const c = p.setup.cities[selectedCityIdx];
      if (!c || !p.cities[c.id]) return p;
      const dps = [...p.cities[c.id].dayPlans];

      const fromIdx = dps.findIndex((dp) => dp.date === fromDate);
      if (fromIdx < 0) return p;
      const fromInsts = [...dps[fromIdx].instances];
      const target = fromInsts.find((i) => i.instanceId === instanceId);
      if (!target) return p;

      dps[fromIdx] = { ...dps[fromIdx], instances: fromInsts.filter((i) => i.instanceId !== instanceId) };

      const toIdx = dps.findIndex((dp) => dp.date === toDate);
      const newInst: PlannedSpotInstance = { instanceId: nanoid(8), spot: target.spot };
      if (toIdx >= 0) {
        dps[toIdx] = { ...dps[toIdx], instances: [...dps[toIdx].instances, newInst] };
      } else {
        dps.push({ date: toDate, cityId: c.id, instances: [newInst] });
      }
      return { ...p, cities: { ...p.cities, [c.id]: { ...p.cities[c.id], dayPlans: dps } } };
    });
    setMovingInstance(null);
  };

  const moveInstance = (date: string, instanceId: string, dir: "up" | "down") => {
    const list = [...getInstances(date)];
    const idx = list.findIndex((i) => i.instanceId === instanceId);
    if (dir === "up" && idx > 0) [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
    else if (dir === "down" && idx < list.length - 1) [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
    updateInstances(date, list);
  };

  const duplicateInstance = (date: string, instanceId: string) => {
    const list = getInstances(date);
    const idx = list.findIndex((i) => i.instanceId === instanceId);
    if (idx < 0) return;
    const copy: PlannedSpotInstance = { instanceId: nanoid(8), spot: list[idx].spot };
    updateInstances(date, [...list.slice(0, idx + 1), copy, ...list.slice(idx + 1)]);
  };

  const removeInstance = (date: string, instanceId: string) => {
    updateInstances(date, getInstances(date).filter((i) => i.instanceId !== instanceId));
  };

  // 宿泊施設
  const addAccommodation = () => {
    if (!accomName.trim() || !accomCheckIn || !accomCheckOut) return;
    const accom: Accommodation = {
      id: nanoid(8), name: accomName.trim(),
      checkIn: accomCheckIn, checkOut: accomCheckOut,
    };
    mutate((p) => {
      const c = p.setup.cities[selectedCityIdx];
      if (!c || !p.cities[c.id]) return p;
      return { ...p, cities: { ...p.cities, [c.id]: { ...p.cities[c.id], accommodations: [...p.cities[c.id].accommodations, accom] } } };
    });
    setAccomName(""); setAccomCheckIn(""); setAccomCheckOut(""); setShowAddAccom(false);
  };

  const removeAccommodation = (id: string) => {
    mutate((p) => {
      const c = p.setup.cities[selectedCityIdx];
      if (!c || !p.cities[c.id]) return p;
      return { ...p, cities: { ...p.cities, [c.id]: { ...p.cities[c.id], accommodations: p.cities[c.id].accommodations.filter((a) => a.id !== id) } } };
    });
  };

  // 交通フォーム
  const openTransportForm = (fromId: string, toId: string) => {
    const key = `${fromId}-${toId}`;
    const ex = planState.transports.find((t) => t.fromCityId === fromId && t.toCityId === toId);
    setTMode((ex?.mode as TransMode) ?? "飛行機");
    setTDuration(ex?.duration ?? "");
    setTOperator(ex?.operator ?? "");
    setTServiceNum(ex?.serviceNumber ?? "");
    setTDeptPlace(ex?.departurePlace ?? "");
    setTArrPlace(ex?.arrivalPlace ?? "");
    setTDeptTime(ex?.departureTime ?? "");
    setTArrTime(ex?.arrivalTime ?? "");
    setTBookingStatus(ex?.bookingStatus ?? "not_booked");
    setTBookingNote(ex?.bookingNote ?? "");
    setTransFormKey(key);
  };

  const saveTransport = (fromId: string, toId: string) => {
    const isPublicSave = PUBLIC_MODES.includes(tMode as any);
    const transport: CityTransport = {
      fromCityId: fromId, toCityId: toId,
      mode: tMode, duration: tDuration,
      bookingNote: tBookingNote,
      ...(isPublicSave && tOperator ? { operator: tOperator } : {}),
      ...(isPublicSave && tServiceNum ? { serviceNumber: tServiceNum } : {}),
      ...(isPublicSave && tDeptPlace ? { departurePlace: tDeptPlace } : {}),
      ...(isPublicSave && tArrPlace ? { arrivalPlace: tArrPlace } : {}),
      ...(isPublicSave && tDeptTime ? { departureTime: tDeptTime } : {}),
      ...(isPublicSave && tArrTime ? { arrivalTime: tArrTime } : {}),
      ...(isPublicSave ? { bookingStatus: tBookingStatus } : {}),
    };
    mutate((p) => ({
      ...p,
      transports: [
        ...p.transports.filter((t) => !(t.fromCityId === fromId && t.toCityId === toId)),
        transport,
      ],
    }));
    setTransFormKey(null);
  };

  const isPublic = PUBLIC_MODES.includes(tMode as any);
  const nextCity: CityEntry | undefined = cities[selectedCityIdx + 1];
  const existingTransport = nextCity
    ? planState.transports.find((t) => t.fromCityId === city.id && t.toCityId === nextCity.id)
    : null;

  // ── レンダリング ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="px-4 pt-5 pb-4"
        style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setLocation("/plan/city-info")}
            className="flex items-center gap-1.5 text-white/80 text-sm active:opacity-70">
            <ArrowLeft className="h-4 w-4" />都市情報に戻る
          </button>
          <button onClick={() => {
            sessionStorage.setItem("globehub_setup_edit", "true");
            setLocation("/plan/setup");
          }}
            className="flex items-center gap-1.5 text-white/80 text-xs border border-white/30 px-2.5 py-1 rounded-full active:bg-white/10">
            <Settings className="w-3 h-3" />計画を編集
          </button>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">{planState.setup.title}</h1>
        </div>
        <p className="text-sm text-white/70">スポットを日程に割り当てましょう</p>
      </div>
      <PlannerProgress step={4} />

      {/* 都市タブ */}
      {cities.length > 1 && (
        <div className="flex overflow-x-auto gap-2 px-4 py-3 border-b border-[#EDE9FE] bg-[#FAF9FF]"
          style={{ scrollbarWidth: "none" }}>
          {cities.map((c, i) => (
            <button key={c.id} onClick={() => { setSelectedCityIdx(i); setMovingInstance(null); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                i === selectedCityIdx
                  ? "bg-[#3C237D] text-white"
                  : "bg-white border border-[#EDE9FE] text-gray-600"
              }`}>
              <Globe className="w-3.5 h-3.5" />{c.name}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 px-4 py-4 pb-32 space-y-5">
        {/* 都市サブヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-[#1E1B4B]">{city.name}</h2>
            <p className="text-xs text-muted-foreground">
              {city.startDate} 〜 {city.endDate}（{calcDaysCount(city.startDate, city.endDate)}日間）
            </p>
          </div>
          <span className="text-xs text-[#3C237D] bg-[#EDE9FE] px-2.5 py-1 rounded-full font-semibold">
            {allSpots.length}件のスポット
          </span>
        </div>

        {/* ── スポット地図 ── */}
        {allSpots.length > 0 && (
          <div className="rounded-2xl border border-[#EDE9FE] overflow-hidden"
            style={{ boxShadow: "0 2px 8px hsl(257 56% 31% / 0.06)" }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#EDE9FE] bg-[#3C237D]/5">
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4 text-[#3C237D]" />
                <span className="text-sm font-bold text-[#1E1B4B]">スポット地図（{city.name}）</span>
              </div>
              <a href={
                allSpots.length >= 2
                  ? `https://www.google.com/maps/dir/${allSpots.slice(0, 8).map((s) => encodeURIComponent(s.name + " " + city.name)).join("/")}`
                  : `https://www.google.com/maps/search/${encodeURIComponent(allSpots[0].name + " " + city.name)}`
              } target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-[#3C237D] active:opacity-70">
                <ExternalLink className="w-3.5 h-3.5" />外部で開く
              </a>
            </div>
            <iframe src={buildMapEmbedUrl(allSpots, city.name)}
              className="w-full" style={{ height: "220px", border: 0 }}
              allowFullScreen loading="lazy" title={`${city.name}スポット地図`} />
          </div>
        )}

        {/* ── スポット一覧 + 日程割り当て ── */}
        {allSpots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EDE9FE] py-10 flex flex-col items-center">
            <MapPin className="w-8 h-8 text-[#3C237D]/20 mb-2" />
            <p className="text-sm text-muted-foreground">スポットが登録されていません</p>
            <button onClick={() => {
              sessionStorage.setItem("globehub_day_planner_return", "true");
              mutate((p) => ({ ...p, currentCityIndex: selectedCityIdx }));
              setLocation("/plan/spots");
            }}
              className="mt-2 text-xs font-semibold text-[#3C237D] underline underline-offset-2">
              スポット検索へ
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#1E1B4B]">スポット一覧 — 日程に割り当て</h3>
              <button onClick={() => {
                sessionStorage.setItem("globehub_day_planner_return", "true");
                mutate((p) => ({ ...p, currentCityIndex: selectedCityIdx }));
                setLocation("/plan/spots");
              }}
                className="flex items-center gap-1 text-xs font-semibold text-[#3C237D] border border-[#3C237D]/40 px-2.5 py-1 rounded-full active:bg-[#EDE9FE]">
                <Plus className="w-3.5 h-3.5" />スポットを追加
              </button>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              各スポットの下の日程ボタンをタップして割り当て（紫=追加済み）
            </p>
            {allSpots.map((spot) => (
              <div key={spot.id} className="rounded-2xl border border-[#EDE9FE] bg-white overflow-hidden"
                style={{ boxShadow: "0 1px 6px hsl(257 56% 31% / 0.06)" }}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {spot.photoUrl ? (
                    <img src={spot.photoUrl} alt={spot.name}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#3C237D]/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1E1B4B] truncate">{spot.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {spot.categoryName ?? ""}{spot.duration ? ` · ${spot.duration}` : ""}
                    </p>
                  </div>
                </div>
                {/* 日程割り当てボタン（横スクロール対応） */}
                <div className="flex overflow-x-auto gap-1.5 px-3 pb-3" style={{ scrollbarWidth: "none" }}>
                  {dates.map((date, di) => {
                    const active = spotInDay(dayPlans, date, spot.id);
                    return (
                      <button key={date} onClick={() => toggleSpotDay(spot, date)}
                        className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                          active ? "bg-[#3C237D] text-white" : "bg-[#FAF9FF] border border-[#EDE9FE] text-gray-500"
                        }`}>
                        {active && <span className="text-[9px]">✓</span>}
                        Day {di + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 日程プレビュー ── */}
        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold text-[#1E1B4B]">日程プレビュー</h3>
          {dates.map((date, di) => {
            const instances = getInstances(date);
            const accoms = getAccomsForDate(date);
            const isExpanded = expandedDays.has(date);
            const totalHours = instances.reduce((sum, i) => sum + estimateHours(i.spot.duration ?? ""), 0);
            return (
              <div key={date} className="rounded-2xl border border-[#EDE9FE] overflow-hidden"
                style={{ boxShadow: "0 1px 4px hsl(257 56% 31% / 0.06)" }}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#3C237D]/5 active:bg-[#EDE9FE]"
                  onClick={() => setExpandedDays((prev) => {
                    const next = new Set(prev);
                    if (next.has(date)) next.delete(date); else next.add(date);
                    return next;
                  })}>
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays className="w-4 h-4 text-[#3C237D] flex-shrink-0" />
                    <span className="text-sm font-bold text-[#1E1B4B]">Day {di + 1} — {fmtDateJa(date)}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {instances.length}件
                      {totalHours > 0 && <span className="ml-1">· {fmtHours(totalHours)}</span>}
                      {accoms.length > 0 && <span className="ml-1">· 🏨×{accoms.length}</span>}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="p-3 space-y-2">
                    {instances.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">スポットが割り当てられていません</p>
                    ) : (
                      instances.map((inst, idx) => (
                        <div key={inst.instanceId} className="space-y-1">
                          <div className="flex items-center gap-2 rounded-xl bg-[#FAF9FF] border border-[#EDE9FE] px-2.5 py-2">
                            <span className="w-5 h-5 rounded-full bg-[#3C237D]/10 flex items-center justify-center text-[10px] font-bold text-[#3C237D] flex-shrink-0">
                              {idx + 1}
                            </span>
                            {inst.spot.photoUrl ? (
                              <img src={inst.spot.photoUrl} alt={inst.spot.name}
                                className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-3.5 h-3.5 text-[#3C237D]/40" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#1E1B4B] truncate">{inst.spot.name}</p>
                              {inst.spot.duration && (
                                <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />{inst.spot.duration}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => moveInstance(date, inst.instanceId, "up")} disabled={idx === 0}
                                className="w-6 h-6 rounded-lg bg-white border border-gray-100 flex items-center justify-center disabled:opacity-30 active:scale-90">
                                <ChevronUp className="w-3 h-3 text-gray-500" />
                              </button>
                              <button onClick={() => moveInstance(date, inst.instanceId, "down")} disabled={idx === instances.length - 1}
                                className="w-6 h-6 rounded-lg bg-white border border-gray-100 flex items-center justify-center disabled:opacity-30 active:scale-90">
                                <ChevronDown className="w-3 h-3 text-gray-500" />
                              </button>
                              {/* 別の日へ移動 */}
                              <button
                                onClick={() => setMovingInstance(
                                  movingInstance?.instanceId === inst.instanceId ? null : { date, instanceId: inst.instanceId }
                                )}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center active:scale-90 ${
                                  movingInstance?.instanceId === inst.instanceId
                                    ? "bg-amber-400 border border-amber-500"
                                    : "bg-amber-50 border border-amber-200"
                                }`}
                                title="別の日へ移動">
                                <ArrowRight className="w-3 h-3 text-amber-700" />
                              </button>
                              <button onClick={() => duplicateInstance(date, inst.instanceId)}
                                className="w-6 h-6 rounded-lg bg-[#EDE9FE] flex items-center justify-center active:scale-90" title="複製">
                                <Copy className="w-2.5 h-2.5 text-[#3C237D]" />
                              </button>
                              <button onClick={() => removeInstance(date, inst.instanceId)}
                                className="w-6 h-6 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center active:scale-90">
                                <X className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          </div>
                          {/* 別日移動ピッカー */}
                          {movingInstance?.date === date && movingInstance?.instanceId === inst.instanceId && (
                            <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                              <p className="w-full text-[10px] text-amber-700 font-semibold mb-0.5">移動先の日を選択：</p>
                              {dates.filter((d) => d !== date).map((d, di2) => (
                                <button key={d}
                                  onClick={() => moveInstanceToDay(date, inst.instanceId, d)}
                                  className="text-xs px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-800 font-semibold active:bg-amber-100">
                                  Day {dates.indexOf(d) + 1} ({fmtDateJa(d)})
                                </button>
                              ))}
                              <button onClick={() => setMovingInstance(null)}
                                className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-500">
                                キャンセル
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {accoms.length > 0 && (
                      <div className="border-t border-[#EDE9FE] pt-2 space-y-1.5">
                        {accoms.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs text-[#3C237D]">
                            <Hotel className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="font-medium truncate">{a.name}</span>
                            <span className="text-gray-400 text-[10px] ml-auto flex-shrink-0">〜{a.checkOut}まで</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── 宿泊施設 ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#1E1B4B] flex items-center gap-1.5">
              <Hotel className="w-4 h-4 text-[#3C237D]" />宿泊施設
            </h3>
            <button onClick={() => { setAccomCheckIn(city.startDate); setAccomCheckOut(city.endDate); setShowAddAccom(true); }}
              className="flex items-center gap-1 text-xs font-semibold text-[#3C237D] border border-[#3C237D]/40 px-2.5 py-1 rounded-full active:bg-[#EDE9FE]">
              <Plus className="w-3.5 h-3.5" />追加
            </button>
          </div>

          {accommodations.length === 0 && !showAddAccom && (
            <div className="rounded-xl border border-dashed border-[#EDE9FE] py-4 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">宿泊施設が登録されていません</p>
            </div>
          )}

          {accommodations.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-[#EDE9FE] bg-[#FAF9FF] px-3 py-2.5">
              <Hotel className="w-4 h-4 text-[#3C237D] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#1E1B4B]">{a.name}</p>
                <p className="text-[10px] text-gray-400">チェックイン {a.checkIn} 〜 チェックアウト {a.checkOut}</p>
              </div>
              <button onClick={() => removeAccommodation(a.id)}
                className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center active:scale-90">
                <X className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          ))}

          {showAddAccom && (
            <div className="rounded-2xl border border-[#EDE9FE] bg-[#FAF9FF] p-4 space-y-3">
              <p className="text-sm font-bold text-[#1E1B4B]">宿泊施設を追加</p>
              <input type="text" value={accomName} onChange={(e) => setAccomName(e.target.value)}
                placeholder="施設名（例: ホテルグランド東京）"
                className="w-full h-10 px-3 rounded-xl border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">チェックイン</p>
                  <input type="date" value={accomCheckIn} min={city.startDate} max={city.endDate}
                    onChange={(e) => setAccomCheckIn(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">チェックアウト</p>
                  <input type="date" value={accomCheckOut} min={accomCheckIn || city.startDate} max={city.endDate}
                    onChange={(e) => setAccomCheckOut(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">選択した期間のすべての日程に自動反映されます</p>
              <div className="flex gap-2">
                <button onClick={() => setShowAddAccom(false)}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">
                  キャンセル
                </button>
                <button onClick={addAccommodation}
                  disabled={!accomName.trim() || !accomCheckIn || !accomCheckOut}
                  className="flex-1 h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-40 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}>
                  追加
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 都市間の移動手段 ── */}
        {nextCity && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#1E1B4B] flex items-center gap-1.5">
                <Plane className="w-4 h-4 text-[#3C237D]" />
                {city.name} → {nextCity.name} の移動
              </h3>
              <button onClick={() => openTransportForm(city.id, nextCity.id)}
                className="flex items-center gap-1 text-xs font-semibold text-[#3C237D] border border-[#3C237D]/40 px-2.5 py-1 rounded-full active:bg-[#EDE9FE]">
                {existingTransport ? "編集" : <><Plus className="w-3.5 h-3.5" />追加</>}
              </button>
            </div>

            {existingTransport && transFormKey !== `${city.id}-${nextCity.id}` && (
              <div className="rounded-xl border border-[#EDE9FE] bg-[#FAF9FF] px-4 py-3 space-y-1">
                {(() => {
                  const Icon = TRANSPORT_ICONS[existingTransport.mode as TransMode] ?? HelpCircle;
                  return (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className="w-4 h-4 text-[#3C237D] flex-shrink-0" />
                        <p className="text-sm font-semibold text-[#1E1B4B]">
                          {existingTransport.mode}{existingTransport.duration ? ` — ${existingTransport.duration}` : ""}
                        </p>
                        {existingTransport.bookingStatus && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto ${
                            existingTransport.bookingStatus === "booked" ? "bg-green-100 text-green-700"
                            : existingTransport.bookingStatus === "not_required" ? "bg-gray-100 text-gray-600"
                            : "bg-amber-50 text-amber-700"
                          }`}>
                            {BOOKING_LABELS[existingTransport.bookingStatus]}
                          </span>
                        )}
                      </div>
                      {(existingTransport.departurePlace || existingTransport.arrivalPlace) && (
                        <p className="text-xs text-gray-600 pl-6">
                          {existingTransport.departurePlace ?? "?"} → {existingTransport.arrivalPlace ?? "?"}
                          {(existingTransport.departureTime || existingTransport.arrivalTime) && (
                            <span className="text-gray-400 ml-1.5">
                              ({existingTransport.departureTime ?? "--:--"} 〜 {existingTransport.arrivalTime ?? "--:--"})
                            </span>
                          )}
                        </p>
                      )}
                      {(existingTransport.operator || existingTransport.serviceNumber) && (
                        <p className="text-xs text-gray-500 pl-6">
                          {[existingTransport.operator, existingTransport.serviceNumber].filter(Boolean).join(" / ")}
                        </p>
                      )}
                      {existingTransport.bookingNote && (
                        <p className="text-xs text-gray-400 pl-6">{existingTransport.bookingNote}</p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {!existingTransport && transFormKey !== `${city.id}-${nextCity.id}` && (
              <div className="rounded-xl border border-dashed border-[#EDE9FE] py-4 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">移動手段が未設定です</p>
              </div>
            )}

            {transFormKey === `${city.id}-${nextCity.id}` && (
              <div className="rounded-2xl border border-[#EDE9FE] bg-[#FAF9FF] p-4 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-2">移動手段</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_MODES.map((m) => {
                      const Icon = TRANSPORT_ICONS[m];
                      return (
                        <button key={m} onClick={() => setTMode(m)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            tMode === m ? "bg-[#3C237D] text-white border-[#3C237D]" : "bg-white text-gray-600 border-gray-200"
                          }`}>
                          <Icon className="w-3.5 h-3.5" />{m}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* 所要時間（車・その他のみ） */}
                {(tMode === "車" || tMode === "その他") && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1">所要時間</p>
                    <input type="text" value={tDuration} onChange={(e) => setTDuration(e.target.value)}
                      placeholder="例: 約2時間、1時間30分"
                      className="w-full h-10 px-3 rounded-xl border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                  </div>
                )}
                {isPublic && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1">運航会社名（任意）</p>
                        <input type="text" value={tOperator} onChange={(e) => setTOperator(e.target.value)}
                          placeholder="例: JAL、JR東日本"
                          className="w-full h-10 px-3 rounded-xl border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1">便名・列車名（任意）</p>
                        <input type="text" value={tServiceNum} onChange={(e) => setTServiceNum(e.target.value)}
                          placeholder="例: JL123、のぞみ1号"
                          className="w-full h-10 px-3 rounded-xl border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1">出発場所（任意）</p>
                        <input type="text" value={tDeptPlace} onChange={(e) => setTDeptPlace(e.target.value)}
                          placeholder="例: 成田空港T1"
                          className="w-full h-10 px-3 rounded-xl border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1">到着場所（任意）</p>
                        <input type="text" value={tArrPlace} onChange={(e) => setTArrPlace(e.target.value)}
                          placeholder="例: CDG空港T2E"
                          className="w-full h-10 px-3 rounded-xl border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1">出発時間（任意）</p>
                        <input type="time" value={tDeptTime} onChange={(e) => setTDeptTime(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1">到着時間（任意）</p>
                        <input type="time" value={tArrTime} onChange={(e) => setTArrTime(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">予約状況</p>
                      <div className="flex gap-2">
                        {(["booked", "not_booked", "not_required"] as const).map((s) => (
                          <button key={s} onClick={() => setTBookingStatus(s)}
                            className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                              tBookingStatus === s ? "bg-[#3C237D] text-white border-[#3C237D]" : "bg-white text-gray-600 border-gray-200"
                            }`}>
                            {BOOKING_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1">予約メモ（任意）</p>
                  <input type="text" value={tBookingNote} onChange={(e) => setTBookingNote(e.target.value)}
                    placeholder="例: LCC予約済み、事前予約推奨"
                    className="w-full h-10 px-3 rounded-xl border border-[#EDE9FE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTransFormKey(null)}
                    className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">
                    キャンセル
                  </button>
                  <button onClick={() => saveTransport(city.id, nextCity.id)}
                    className="flex-1 h-10 rounded-xl text-white text-sm font-semibold active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}>
                    保存
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* フッター */}
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-[#EDE9FE] z-40"
        style={{ bottom: "64px", boxShadow: "0 -4px 16px hsl(257 56% 31% / 0.10)" }}>
        <button onClick={() => setLocation("/plan/itinerary")}
          className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: "0 4px 14px hsl(257 56% 31% / 0.28)" }}>
          旅のしおりへ進む
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
