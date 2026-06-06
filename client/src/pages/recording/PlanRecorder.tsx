import { useState, useCallback, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft, Plus, X, ChevronUp, ChevronDown, MapPin, Globe,
  Shield, Car, Lightbulb, Heart, Check, CheckCircle2,
  Loader2, ChevronRight, Camera, Search, Mic, Square,
  Pencil, RotateCcw, Keyboard, Image as ImageIcon,
} from "lucide-react";
import { nanoid } from "nanoid";
import { getMultiCityPlans, type SavedMultiCityPlan } from "@/lib/planStorage";
import {
  getPlanRecord, savePlanRecord, initPlanRecord, hasCityData,
  PLAN_CATEGORIES, SUMMARY_STEPS,
  type PlanRecord, type CityRecord, type SpotRecord, type ExtraSpot,
} from "./planRecordStorage";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useToast } from "@/hooks/use-toast";
import type { Spot } from "../planner/TripPlanner";

// ── StarRating ────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button"
          onClick={(e) => { e.stopPropagation(); onChange(value === n ? 0 : n); }}
          className="text-xl transition-colors active:scale-90">
          <span className={n <= value ? "text-amber-400" : "text-gray-200"}>★</span>
        </button>
      ))}
    </div>
  );
}

// ── PhotoStrip ────────────────────────────────────────────────
function PhotoStrip({ id, photos, onAdd, onRemove }: {
  id: string; photos: File[];
  onAdd: (id: string, files: FileList) => void;
  onRemove: (id: string, idx: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium mb-1.5">写真（最大5枚）</p>
      <div className="flex flex-wrap gap-1.5">
        {photos.map((file, i) => (
          <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
            <button onClick={() => onRemove(id, i)}
              className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        ))}
        {photos.length < 5 && (
          <>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files) { onAdd(id, e.target.files); e.target.value = ""; } }} />
            <button onClick={() => inputRef.current?.click()}
              className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 active:bg-gray-100">
              <Camera className="w-4 h-4 text-gray-400" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── LocationPicker ────────────────────────────────────────────
interface LocValue { lat?: number; lng?: number; address?: string }

function LocationPicker({ value, onChange, onClear }: {
  value: LocValue;
  onChange: (v: LocValue) => void;
  onClear: () => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"search" | "photo" | "address">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [searching, setSearching] = useState(false);
  const [addrInput, setAddrInput] = useState(value.address ?? "");
  const hasLoc = !!(value.lat && value.lng) || !!value.address;

  const handlePhotoGps = async (files: FileList) => {
    if (!files[0]) return;
    try {
      const ExifReader = (await import("exifreader")).default;
      const buf = await files[0].arrayBuffer();
      const tags = ExifReader.load(buf);
      const lat = tags?.GPSLatitude?.description;
      const lng = tags?.GPSLongitude?.description;
      if (lat && lng) {
        onChange({ lat: parseFloat(lat as string), lng: parseFloat(lng as string) });
        toast({ title: "位置情報を取得しました" });
      } else {
        toast({ title: "GPS情報がありませんでした", description: "他の方法で場所を選んでください" });
      }
    } catch { toast({ title: "読み込みエラー", variant: "destructive" }); }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3&accept-language=ja`,
        { headers: { "User-Agent": "GlobeHub/1.0" } }
      );
      const data: any[] = await res.json();
      setResults(data.map((r) => ({ name: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lng) })));
    } catch { toast({ title: "検索に失敗しました", variant: "destructive" }); }
    finally { setSearching(false); }
  };

  if (hasLoc) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-xl border border-green-200">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700 truncate">
            {value.address ?? `${value.lat?.toFixed(4)}, ${value.lng?.toFixed(4)}`}
          </p>
        </div>
        <button onClick={onClear} className="text-xs text-red-400 ml-2 flex-shrink-0">クリア</button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 font-medium">場所を確定（任意）</p>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
        {(["search", "photo", "address"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-1.5 font-medium transition-colors ${mode === m ? "bg-[#3C237D] text-white" : "bg-white text-gray-500"}`}>
            {m === "search" ? "🔍 名前" : m === "photo" ? "📷 写真GPS" : "📍 住所"}
          </button>
        ))}
      </div>
      {mode === "search" && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="スポット名・場所名"
              className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
            <button onClick={handleSearch} disabled={searching}
              className="px-3 h-9 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: "#3C237D" }}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          {results.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i}
                  onClick={() => { onChange({ lat: r.lat, lng: r.lng, address: r.name }); setResults([]); }}
                  className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 text-xs hover:bg-gray-50 truncate">
                  <span className="text-[#3C237D] mr-1">📍</span>{r.name.slice(0, 70)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {mode === "photo" && (
        <label className="block cursor-pointer">
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files && handlePhotoGps(e.target.files)} />
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 text-center text-xs text-gray-500 hover:bg-gray-50">
            写真をタップして選択 → GPS位置情報を自動取得
          </div>
        </label>
      )}
      {mode === "address" && (
        <input value={addrInput} onChange={(e) => setAddrInput(e.target.value)}
          onBlur={() => addrInput.trim() && onChange({ address: addrInput.trim() })}
          placeholder="住所を入力（例：東京都台東区浅草2丁目）"
          className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
      )}
    </div>
  );
}

// ── まとめアイコン ────────────────────────────────────────────
const SUMMARY_ICONS = { safetyTips: Shield, transportTips: Car, travelTips: Lightbulb, memorableMoment: Heart } as const;
const SUMMARY_COLORS = { safetyTips: "#EF4444", transportTips: "#3B82F6", travelTips: "#F59E0B", memorableMoment: "#EC4899" } as const;

type Phase = "spots" | "summary" | "cover";

// ── PlanRecorder ──────────────────────────────────────────────
export default function PlanRecorder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [, params] = useRoute("/record/plan/:planId");
  const planId = params?.planId ?? "";

  const [savedPlan] = useState<SavedMultiCityPlan | null>(() =>
    getMultiCityPlans().find((p) => p.id === planId) ?? null
  );

  const [record, setRecord] = useState<PlanRecord>(() => {
    if (!savedPlan) return { planId, planTitle: "", updatedAt: "", cities: {} };
    return getPlanRecord(planId) ?? initPlanRecord(savedPlan);
  });

  const [selectedCityIdx, setSelectedCityIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("spots");
  const [summaryStepIdx, setSummaryStepIdx] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddSpot, setShowAddSpot] = useState(false);
  const [completing, setCompleting] = useState(false);

  // 写真ストア（spotId → File[]）
  const [spotPhotos, setSpotPhotos] = useState<Record<string, File[]>>({});
  // 表紙画像
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // 追加スポットフォーム
  const [newSpotName, setNewSpotName] = useState("");
  const [newSpotCategory, setNewSpotCategory] = useState("sightseeing");
  const [newSpotRating, setNewSpotRating] = useState(0);
  const [newSpotImpression, setNewSpotImpression] = useState("");
  const [newSpotLocation, setNewSpotLocation] = useState<LocValue>({});

  // まとめ入力モード（音声/テキスト）
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textValue, setTextValue] = useState("");
  const voice = useVoiceRecorder();

  // まとめステップ切り替え時にリセット
  useEffect(() => {
    voice.reset();
    setTextValue("");
    setInputMode("voice");
  }, [summaryStepIdx, selectedCityIdx]);

  // ── 写真ヘルパー ────────────────────────────────────────────
  const addPhotos = (id: string, files: FileList) => {
    setSpotPhotos((prev) => {
      const next = [...(prev[id] ?? []), ...Array.from(files)].slice(0, 5);
      return { ...prev, [id]: next };
    });
  };
  const removePhoto = (id: string, idx: number) => {
    setSpotPhotos((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((_, i) => i !== idx) }));
  };

  // ── レコード更新 ────────────────────────────────────────────
  const updateRecord = useCallback((updater: (r: PlanRecord) => PlanRecord) => {
    setRecord((prev) => { const next = updater(prev); savePlanRecord(next); return next; });
  }, []);

  const updateCityRecord = useCallback((cityId: string, updater: (cr: CityRecord) => CityRecord) => {
    updateRecord((r) => ({ ...r, cities: { ...r.cities, [cityId]: updater(r.cities[cityId]) } }));
  }, [updateRecord]);

  if (!savedPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-3">
        <p className="text-sm text-muted-foreground">旅行計画が見つかりません</p>
        <button onClick={() => setLocation("/record/from-plan")} className="text-sm font-semibold text-[#3C237D] underline">戻る</button>
      </div>
    );
  }

  const cities = savedPlan.cities;
  const city = cities[selectedCityIdx];
  if (!city) return null;

  const cityData = savedPlan.planData.cities[city.id];
  const planSpotsMap: Record<string, Spot> = {};
  for (const s of cityData?.spots ?? []) planSpotsMap[s.id] = s;

  const cityRecord = record.cities[city.id] ?? {
    unifiedOrder: [], spotRecords: {}, extraSpotData: {},
    summary: { safetyTips: "", transportTips: "", travelTips: "", memorableMoment: "" },
  };

  const visitedCount = cityRecord.unifiedOrder.filter((id) =>
    id.startsWith("extra:") ? !!cityRecord.extraSpotData[id]?.name : cityRecord.spotRecords[id]?.visited
  ).length;

  const currentSummaryStep = SUMMARY_STEPS[summaryStepIdx];
  const isLastSummaryStep = summaryStepIdx === SUMMARY_STEPS.length - 1;
  const isLastCity = selectedCityIdx === cities.length - 1;

  // ── スポット操作 ────────────────────────────────────────────
  const updateSpotRecord = (spotId: string, updates: Partial<SpotRecord>) => {
    updateCityRecord(city.id, (cr) => {
      const existing: SpotRecord = cr.spotRecords[spotId] ?? { visited: false, rating: 0, impression: "" };
      return { ...cr, spotRecords: { ...cr.spotRecords, [spotId]: { ...existing, ...updates } } };
    });
  };

  const updateExtraSpot = (extraId: string, updates: Partial<ExtraSpot>) => {
    updateCityRecord(city.id, (cr) => {
      const existing: ExtraSpot = cr.extraSpotData[extraId] ?? { name: "", category: "sightseeing", rating: 0, impression: "" };
      return { ...cr, extraSpotData: { ...cr.extraSpotData, [extraId]: { ...existing, ...updates } } };
    });
  };

  const clearExtraLoc = (extraId: string) => {
    updateCityRecord(city.id, (cr) => {
      const existing = cr.extraSpotData[extraId] ?? { name: "", category: "sightseeing", rating: 0, impression: "" };
      const { lat: _l, lng: _g, address: _a, ...rest } = existing;
      return { ...cr, extraSpotData: { ...cr.extraSpotData, [extraId]: rest as ExtraSpot } };
    });
  };

  const moveItem = (id: string, dir: "up" | "down") => {
    updateCityRecord(city.id, (cr) => {
      const list = [...cr.unifiedOrder];
      const idx = list.indexOf(id);
      if (dir === "up" && idx > 0) [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
      else if (dir === "down" && idx < list.length - 1) [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
      return { ...cr, unifiedOrder: list };
    });
  };

  const deleteItem = (id: string) => {
    updateCityRecord(city.id, (cr) => {
      const order = cr.unifiedOrder.filter((x) => x !== id);
      if (id.startsWith("extra:")) {
        const { [id]: _, ...rest } = cr.extraSpotData;
        return { ...cr, unifiedOrder: order, extraSpotData: rest };
      }
      return { ...cr, unifiedOrder: order };
    });
    if (expandedId === id) setExpandedId(null);
  };

  const clearNewSpotForm = () => {
    setNewSpotName(""); setNewSpotCategory("sightseeing");
    setNewSpotRating(0); setNewSpotImpression(""); setNewSpotLocation({});
  };

  const addExtraSpot = (keepOpen = false) => {
    if (!newSpotName.trim()) return;
    const extraId = `extra:${nanoid(8)}`;
    const locFields: Partial<ExtraSpot> = {};
    if (newSpotLocation.lat !== undefined) locFields.lat = newSpotLocation.lat;
    if (newSpotLocation.lng !== undefined) locFields.lng = newSpotLocation.lng;
    if (newSpotLocation.address !== undefined) locFields.address = newSpotLocation.address;
    updateCityRecord(city.id, (cr) => ({
      ...cr,
      unifiedOrder: [...cr.unifiedOrder, extraId],
      extraSpotData: {
        ...cr.extraSpotData,
        [extraId]: {
          name: newSpotName.trim(), category: newSpotCategory,
          rating: newSpotRating, impression: newSpotImpression,
          ...locFields,
        },
      },
    }));
    clearNewSpotForm();
    if (!keepOpen) setShowAddSpot(false);
  };

  const updateSummary = (key: keyof typeof cityRecord.summary, value: string) => {
    updateCityRecord(city.id, (cr) => ({ ...cr, summary: { ...cr.summary, [key]: value } }));
  };

  // ── まとめ進行 ───────────────────────────────────────────────
  const advanceSummary = (value: string) => {
    if (value.trim()) updateSummary(currentSummaryStep.key, value.trim());
    if (!isLastSummaryStep) {
      setSummaryStepIdx((i) => i + 1);
    } else if (!isLastCity) {
      setSelectedCityIdx((i) => i + 1);
      setPhase("spots");
      setSummaryStepIdx(0);
    } else {
      setPhase("cover");
    }
  };

  const skipSummary = () => advanceSummary("");

  const saveSummary = () => {
    if (voice.isRecording) voice.stopRecording();
    const value = inputMode === "text" ? textValue : voice.isEditMode ? voice.editValue : voice.transcript;
    advanceSummary(value);
  };

  // ── 完成処理 ─────────────────────────────────────────────────
  const handleComplete = async () => {
    const anyCityHasData = cities.some((c) => hasCityData(record.cities[c.id] ?? {
      unifiedOrder: [], spotRecords: {}, extraSpotData: {},
      summary: { safetyTips: "", transportTips: "", travelTips: "", memorableMoment: "" },
    }));
    if (!anyCityHasData) {
      toast({ title: "記録するデータがありません" });
      return;
    }
    setCompleting(true);
    const tripIds: string[] = [];
    try {
      for (const c of cities) {
        const cr = record.cities[c.id];
        if (!cr || !hasCityData(cr)) continue;

        const tripRes = await fetch("/api/trips", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({
            title: cities.length > 1 ? `${savedPlan.title} — ${c.name}` : savedPlan.title,
            city: c.name, startDate: c.startDate, endDate: c.endDate,
          }),
        });
        if (tripRes.status === 401) { setLocation("/mypage/login"); return; }
        if (!tripRes.ok) throw new Error("trip creation failed");
        const trip = await tripRes.json();
        tripIds.push(trip.id);

        const { safetyTips, transportTips, travelTips, memorableMoment } = cr.summary;
        if (safetyTips || transportTips || travelTips || memorableMoment) {
          await fetch(`/api/trips/${trip.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({ safetyTips, transportTips, travelTips, memorableMoment }),
          });
        }

        // 表紙アップロード（最初の都市のみ）
        if (coverImage && tripIds.length === 1) {
          const fd = new FormData();
          fd.append("photo", coverImage);
          await fetch(`/api/trips/${trip.id}/hero-photo`, {
            method: "POST", credentials: "include", body: fd,
          }).catch(() => {});
        }

        const cd = savedPlan.planData.cities[c.id];
        const spotsMap: Record<string, Spot> = {};
        for (const s of cd?.spots ?? []) spotsMap[s.id] = s;

        for (const itemId of cr.unifiedOrder) {
          const isExtra = itemId.startsWith("extra:");
          const sr = isExtra ? null : cr.spotRecords[itemId];
          const ed = isExtra ? cr.extraSpotData[itemId] : null;
          if (!isExtra && !sr?.visited && !sr?.rating && !sr?.impression) continue;
          if (isExtra && !ed?.name) continue;

          const spotRes = await fetch(`/api/trips/${trip.id}/spots`, {
            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({}),
          });
          const spot = await spotRes.json();
          const patch: Record<string, unknown> = {};
          if (isExtra && ed) {
            patch.name = ed.name;
            if (ed.category)   patch.category = ed.category;
            if (ed.rating)     patch.rating = ed.rating;
            if (ed.impression) patch.notes = ed.impression;
            if (ed.lat)        patch.lat = ed.lat;
            if (ed.lng)        patch.lng = ed.lng;
            if (ed.address)    patch.address = ed.address;
          } else if (sr) {
            patch.name = spotsMap[itemId]?.name ?? "スポット";
            patch.category = "sightseeing";
            if (sr.rating)     patch.rating = sr.rating;
            if (sr.impression) patch.notes = sr.impression;
          }
          if (Object.keys(patch).length > 0) {
            await fetch(`/api/spots/${spot.id}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
              body: JSON.stringify(patch),
            });
          }
          const photos = spotPhotos[itemId] ?? [];
          if (photos.length > 0) {
            const fd = new FormData();
            for (const f of photos) fd.append("photos", f);
            await fetch(`/api/spots/${spot.id}/photos`, { method: "POST", credentials: "include", body: fd });
          }
        }
      }
      toast({ title: "🎉 旅の記録が完成しました！" });
      setTimeout(() => {
        if (tripIds.length === 1) setLocation(`/record/${tripIds[0]}`);
        else setLocation("/record");
      }, 800);
    } catch {
      toast({ title: "エラー", description: "記録の作成に失敗しました", variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ── PHASE: SUMMARY ─────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════
  if (phase === "summary") {
    const StepIcon = SUMMARY_ICONS[currentSummaryStep.key];
    const color = SUMMARY_COLORS[currentSummaryStep.key];
    const hasText = inputMode === "text"
      ? textValue.trim().length > 0
      : voice.transcript.trim().length > 0 || (voice.isEditMode && voice.editValue.trim().length > 0);
    const displayFinal = voice.isEditMode ? voice.editValue : voice.transcript;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* ヘッダー */}
        <div className="px-4 pt-5 pb-4" style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}>
          <button onClick={() => setPhase("spots")}
            className="flex items-center gap-1.5 text-white/80 text-sm mb-3 active:opacity-70">
            <ArrowLeft className="h-4 w-4" />{city.name}のスポット記録に戻る
          </button>
          <h1 className="text-base font-bold text-white">{city.name}のまとめ</h1>
        </div>

        {/* プログレス */}
        <div className="px-4 pt-3 pb-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: color + "30" }}>
                <StepIcon className="w-3 h-3" style={{ color }} />
              </div>
              <span className="font-medium">{currentSummaryStep.label}</span>
            </div>
            <span>{summaryStepIdx + 1} / {SUMMARY_STEPS.length}</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((summaryStepIdx + 1) / SUMMARY_STEPS.length) * 100}%` }} />
          </div>
        </div>

        {/* モード切り替え */}
        <div className="flex justify-center px-4 pb-2">
          <div className="inline-flex rounded-full border bg-muted p-0.5 gap-0.5">
            {(["voice", "text"] as const).map((m) => (
              <button key={m} type="button"
                onClick={() => { if (voice.isRecording) voice.stopRecording(); setInputMode(m); }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${inputMode === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
                {m === "voice" ? <><Mic className="w-3.5 h-3.5" />音声</> : <><Keyboard className="w-3.5 h-3.5" />テキスト</>}
              </button>
            ))}
          </div>
        </div>

        {/* 入力エリア */}
        <div className="flex-1 flex flex-col px-6 py-4 pb-32 gap-6">
          {inputMode === "text" ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm text-center leading-relaxed">{currentSummaryStep.hint}</p>
              <textarea value={textValue} onChange={(e) => setTextValue(e.target.value)}
                placeholder={currentSummaryStep.hint}
                rows={6}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#3C237D] bg-muted/30 leading-relaxed"
                autoFocus />
              {textValue.trim() && (
                <button onClick={() => setTextValue("")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto">
                  <RotateCcw className="w-3 h-3" />クリア
                </button>
              )}
            </div>
          ) : (
            <>
              {(voice.transcript || voice.isEditMode) && (
                <div className="w-full space-y-3">
                  {voice.isEditMode ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">テキストを修正</span>
                        <button onClick={voice.reset} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <RotateCcw className="w-3 h-3" />最初から
                        </button>
                      </div>
                      <textarea value={voice.editValue} onChange={(e) => voice.setEditValue(e.target.value as any)}
                        rows={5} autoFocus
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#3C237D] bg-muted/30" />
                      <button onClick={voice.handleConfirmEdit}
                        className="w-full h-10 rounded-xl border border-gray-300 text-sm font-medium flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />修正完了
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-full rounded-2xl bg-muted/50 border px-4 py-3 text-base leading-relaxed">
                        {displayFinal}
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <button onClick={voice.handleOpenEdit} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3 h-3" />修正する
                        </button>
                        <button onClick={voice.reset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <RotateCcw className="w-3 h-3" />やり直す
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col items-center gap-4">
                {!voice.transcript && !voice.isRecording && (
                  <p className="text-muted-foreground text-sm text-center leading-relaxed">{currentSummaryStep.hint}</p>
                )}
                {voice.isRecording && voice.interimText && (
                  <div className="w-full max-w-xs text-center px-3 py-2 bg-muted/30 rounded-xl border">
                    <p className="text-sm text-muted-foreground">{voice.interimText}</p>
                  </div>
                )}
                <div className="relative flex items-center justify-center">
                  {voice.isRecording && (
                    <>
                      <div className="absolute w-32 h-32 rounded-full bg-destructive/10 animate-ping" style={{ animationDuration: "1.5s" }} />
                      <div className="absolute w-26 h-26 rounded-full bg-destructive/15 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.5s" }} />
                    </>
                  )}
                  <button type="button"
                    onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
                    disabled={!voice.isSupported}
                    className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
                      voice.isRecording ? "bg-destructive text-white scale-105" : "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
                    } disabled:opacity-40`}>
                    {voice.isRecording ? <Square className="w-8 h-8 fill-white" /> : <Mic className="w-8 h-8" />}
                  </button>
                </div>
                <p className={`text-sm font-medium ${voice.isRecording ? "text-destructive" : "text-muted-foreground"}`}>
                  {!voice.isSupported ? "このブラウザは音声入力に非対応です"
                    : voice.isRecording ? "● 録音中 — タップして停止"
                    : voice.transcript ? "タップして追記" : "タップして録音開始"}
                </p>
              </div>
            </>
          )}
        </div>

        {/* 下部ボタン */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] p-4 bg-background border-t space-y-2">
          <button onClick={saveSummary} disabled={!hasText}
            className="w-full h-14 rounded-xl text-white text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}>
            {isLastSummaryStep && isLastCity ? "保存して表紙を選ぶ" : isLastSummaryStep ? `保存して${cities[selectedCityIdx + 1]?.name}へ` : "保存して次へ"}
          </button>
          <button onClick={skipSummary}
            className="w-full h-9 rounded-xl text-sm text-muted-foreground hover:bg-muted/50">
            スキップ
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ── PHASE: COVER ───────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════
  if (phase === "cover") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="px-4 pt-5 pb-4" style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}>
          <button onClick={() => { setPhase("summary"); setSummaryStepIdx(SUMMARY_STEPS.length - 1); }}
            className="flex items-center gap-1.5 text-white/80 text-sm mb-3 active:opacity-70">
            <ArrowLeft className="h-4 w-4" />まとめ入力に戻る
          </button>
          <h1 className="text-lg font-bold text-white">表紙写真を選ぶ</h1>
          <p className="text-sm text-white/70 mt-0.5">旅のトップ画像を設定します（任意）</p>
        </div>

        <main className="flex-1 px-4 py-6 pb-36 space-y-4">
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && setCoverImage(e.target.files[0])} />

          {coverImage ? (
            <div className="space-y-3">
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <img src={URL.createObjectURL(coverImage)} alt="表紙" className="w-full h-full object-cover" />
                <button onClick={() => setCoverImage(null)}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-xs text-center text-muted-foreground">選択済み：{coverImage.name}</p>
            </div>
          ) : (
            <button onClick={() => coverInputRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-gray-300 py-12 flex flex-col items-center gap-3 hover:bg-muted/30 active:scale-[0.98] transition-all">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">写真を選択</p>
                <p className="text-xs text-muted-foreground mt-1">この旅を象徴する一枚を選んでください</p>
              </div>
            </button>
          )}
        </main>

        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t z-40" style={{ bottom: "64px" }}>
          <button onClick={handleComplete} disabled={completing}
            className="w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] text-white"
            style={{ background: "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)", boxShadow: "0 4px 14px rgba(249,115,22,0.30)" }}>
            {completing
              ? <><Loader2 className="h-5 w-5 animate-spin" />記録を作成中...</>
              : <><CheckCircle2 className="h-5 w-5" />旅の記録を完成させる</>}
          </button>
          {!coverImage && (
            <button onClick={handleComplete} disabled={completing}
              className="w-full mt-1.5 h-9 text-sm text-muted-foreground hover:text-gray-700">
              表紙なしで完成させる
            </button>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ── PHASE: SPOTS ───────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ヘッダー */}
      <div className="px-4 pt-5 pb-5" style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)" }}>
        <button onClick={() => setLocation("/record/from-plan")}
          className="flex items-center gap-1.5 text-white/80 text-sm mb-4 active:opacity-70">
          <ArrowLeft className="h-4 w-4" />プラン選択に戻る
        </button>
        <h1 className="text-lg font-bold text-white">{savedPlan.title}</h1>
        <p className="text-sm text-white/70 mt-0.5">訪れたスポットに写真・感想を記録しましょう</p>
      </div>

      {/* 都市タブ */}
      {cities.length > 1 && (
        <div className="flex overflow-x-auto gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50" style={{ scrollbarWidth: "none" }}>
          {cities.map((c, i) => {
            const cr = record.cities[c.id];
            const visited = cr?.unifiedOrder.filter((id) =>
              id.startsWith("extra:") ? !!cr.extraSpotData[id]?.name : cr.spotRecords[id]?.visited
            ).length ?? 0;
            const total = cr?.unifiedOrder.length ?? 0;
            return (
              <button key={c.id} onClick={() => { setSelectedCityIdx(i); setExpandedId(null); }}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  i === selectedCityIdx ? "bg-[#3C237D] text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}>
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{c.name}</span>
                <span className={`text-[10px] mt-0.5 ${i === selectedCityIdx ? "text-white/70" : "text-gray-400"}`}>
                  {visited}/{total}訪問
                </span>
              </button>
            );
          })}
        </div>
      )}

      <main className="flex-1 px-4 py-4 pb-36 space-y-5">
        {/* 都市ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">{city.name}</h2>
            <p className="text-xs text-gray-400">{city.startDate} 〜 {city.endDate}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-[#3C237D]">{visitedCount}件訪問</p>
            <p className="text-xs text-gray-400">全{cityRecord.unifiedOrder.length}件</p>
          </div>
        </div>

        {/* スポットリスト */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-gray-800">スポット記録</h3>
            <button onClick={() => { setShowAddSpot(true); setExpandedId(null); }}
              className="flex items-center gap-1 text-xs font-semibold text-[#3C237D] border border-[#3C237D]/40 px-2.5 py-1 rounded-full active:bg-purple-50">
              <Plus className="w-3.5 h-3.5" />スポットを追加
            </button>
          </div>

          {cityRecord.unifiedOrder.length === 0 && !showAddSpot && (
            <div className="rounded-2xl border border-dashed border-gray-200 py-8 text-center">
              <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">スポットがありません</p>
            </div>
          )}

          {cityRecord.unifiedOrder.map((itemId, idx) => {
            const isExtra = itemId.startsWith("extra:");
            const spot = isExtra ? null : planSpotsMap[itemId];
            const ed = isExtra ? (cityRecord.extraSpotData[itemId] ?? { name: "", category: "sightseeing", rating: 0, impression: "" }) : null;
            const sr = isExtra ? null : (cityRecord.spotRecords[itemId] ?? { visited: false, rating: 0, impression: "" });
            const isExpanded = expandedId === itemId;
            const displayName = isExtra ? ed!.name : (spot?.name ?? "（スポット）");
            const rating = isExtra ? ed!.rating : sr!.rating;
            const visited = isExtra ? true : sr!.visited;
            const photos = spotPhotos[itemId] ?? [];

            return (
              <div key={itemId} className="rounded-2xl border border-gray-100 bg-white overflow-hidden"
                style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                <button className="w-full flex items-center gap-3 px-3 py-3 active:bg-gray-50 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : itemId)}>
                  <span className="w-5 h-5 rounded-full bg-[#3C237D]/10 flex items-center justify-center text-[10px] font-bold text-[#3C237D] flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden">
                    {photos.length > 0
                      ? <img src={URL.createObjectURL(photos[0])} alt="" className="w-full h-full object-cover" />
                      : spot?.photoUrl
                      ? <img src={spot.photoUrl} alt={displayName} className="w-full h-full object-cover" />
                      : <div className={`w-full h-full flex items-center justify-center ${isExtra ? "bg-amber-50" : "bg-purple-50"}`}>
                          <MapPin className={`w-4 h-4 ${isExtra ? "text-amber-400" : "text-[#3C237D]/40"}`} />
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {isExtra && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mr-1.5">追加</span>}
                      {displayName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {!isExtra && <span className={`text-[10px] font-semibold ${visited ? "text-green-600" : "text-gray-400"}`}>{visited ? "✓ 訪問済み" : "未訪問"}</span>}
                      {rating > 0 && <span className="text-[10px] text-amber-500">{"★".repeat(rating)}</span>}
                      {photos.length > 0 && <span className="text-[10px] text-blue-400">📷{photos.length}</span>}
                      {isExtra && (ed!.lat || ed!.address) && <span className="text-[10px] text-green-500">📍</span>}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-50 pt-3">
                    {!isExtra ? (
                      <>
                        <div className="flex gap-2">
                          <button onClick={() => updateSpotRecord(itemId, { visited: true })}
                            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-sm font-semibold border transition-colors ${sr!.visited ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-600 border-gray-200"}`}>
                            <Check className="w-4 h-4" />訪問した
                          </button>
                          <button onClick={() => updateSpotRecord(itemId, { visited: false })}
                            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-sm font-semibold border transition-colors ${!sr!.visited ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-white text-gray-400 border-gray-200"}`}>
                            ✕ 訪問しなかった
                          </button>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1.5">評価</p>
                          <StarRating value={sr!.rating} onChange={(v) => updateSpotRecord(itemId, { rating: v })} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">感想・メモ</p>
                          <textarea value={sr!.impression} rows={3}
                            onChange={(e) => updateSpotRecord(itemId, { impression: e.target.value })}
                            placeholder="このスポットの感想を書きましょう…"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                        </div>
                        <PhotoStrip id={itemId} photos={photos} onAdd={addPhotos} onRemove={removePhoto} />
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">スポット名</p>
                          <input value={ed!.name} onChange={(e) => updateExtraSpot(itemId, { name: e.target.value })}
                            className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">カテゴリ</p>
                          <select value={ed!.category} onChange={(e) => updateExtraSpot(itemId, { category: e.target.value })}
                            className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3C237D]">
                            {PLAN_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1.5">評価</p>
                          <StarRating value={ed!.rating} onChange={(v) => updateExtraSpot(itemId, { rating: v })} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">感想・メモ</p>
                          <textarea value={ed!.impression} rows={3}
                            onChange={(e) => updateExtraSpot(itemId, { impression: e.target.value })}
                            placeholder="このスポットの感想を書きましょう…"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3C237D]" />
                        </div>
                        <PhotoStrip id={itemId} photos={photos} onAdd={addPhotos} onRemove={removePhoto} />
                        <LocationPicker
                          value={{ ...(ed!.lat !== undefined && { lat: ed!.lat }), ...(ed!.lng !== undefined && { lng: ed!.lng }), ...(ed!.address !== undefined && { address: ed!.address }) }}
                          onChange={(v) => {
                            const upd: Partial<ExtraSpot> = {};
                            if (v.lat !== undefined) upd.lat = v.lat;
                            if (v.lng !== undefined) upd.lng = v.lng;
                            if (v.address !== undefined) upd.address = v.address;
                            updateExtraSpot(itemId, upd);
                          }}
                          onClear={() => clearExtraLoc(itemId)}
                        />
                      </>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => moveItem(itemId, "up")} disabled={idx === 0}
                        className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center disabled:opacity-30 active:scale-90">
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      </button>
                      <button onClick={() => moveItem(itemId, "down")} disabled={idx === cityRecord.unifiedOrder.length - 1}
                        className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center disabled:opacity-30 active:scale-90">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </button>
                      <button onClick={() => deleteItem(itemId)}
                        className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center active:scale-90 ml-auto">
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 追加スポットフォーム */}
          {showAddSpot && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-bold text-gray-800">スポットを追加</p>
              <input value={newSpotName} onChange={(e) => setNewSpotName(e.target.value)}
                placeholder="スポット名を入力 *"
                className="w-full h-10 px-3 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">カテゴリ</p>
                <select value={newSpotCategory} onChange={(e) => setNewSpotCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {PLAN_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1.5">評価</p>
                <StarRating value={newSpotRating} onChange={setNewSpotRating} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">感想（任意）</p>
                <textarea value={newSpotImpression} onChange={(e) => setNewSpotImpression(e.target.value)}
                  rows={2} placeholder="感想・メモ"
                  className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <LocationPicker value={newSpotLocation} onChange={setNewSpotLocation} onClear={() => setNewSpotLocation({})} />
              <div className="flex gap-2">
                <button onClick={() => { clearNewSpotForm(); setShowAddSpot(false); }}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium bg-white">
                  キャンセル
                </button>
                <button onClick={() => addExtraSpot(true)} disabled={!newSpotName.trim()}
                  className="flex-1 h-10 rounded-xl border border-amber-300 text-amber-700 text-sm font-semibold bg-amber-100 disabled:opacity-40">
                  続けて追加
                </button>
                <button onClick={() => addExtraSpot(false)} disabled={!newSpotName.trim()}
                  className="flex-1 h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)" }}>
                  追加
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* フッター */}
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-gray-100 z-40"
        style={{ bottom: "64px", boxShadow: "0 -4px 16px rgba(0,0,0,0.06)" }}>
        <button onClick={() => { setPhase("summary"); setSummaryStepIdx(0); }}
          className="w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-white"
          style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: "0 4px 14px hsl(257 56% 31% / 0.28)" }}>
          次へ：{city.name}のまとめを入力
          <ChevronRight className="h-5 w-5" />
        </button>
        <p className="text-[11px] text-center text-gray-400 mt-1.5">
          {cities.length > 1 ? `${selectedCityIdx + 1}/${cities.length}都市目` : ""}まとめ入力後に表紙を選んで完成
        </p>
      </div>
    </div>
  );
}
