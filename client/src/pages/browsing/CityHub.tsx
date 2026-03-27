import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Search, MapPin, ArrowLeft, Star, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TripCard } from "@/components/common/TripCard";
import { CategoryChips, DEFAULT_CATEGORIES } from "@/components/common/CategoryChips";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";

// ── ラベル定義 ────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  sightseeing: "観光",
  gourmet: "グルメ",
  nature: "自然",
  experience: "体験",
  street: "街歩き",
  hotel: "宿",
  transport: "移動",
  other: "その他",
};

const COST_LABELS: Record<string, string> = {
  free: "無料",
  cheap: "安い",
  normal: "普通",
  expensive: "高め",
};

const DURATION_LABELS: Record<string, string> = {
  "10min": "10分",
  "30min": "30分",
  "1hour": "1時間",
  halfday: "半日",
};

const SPOT_CATEGORY_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: "すべて" },
  { value: "sightseeing", label: "観光" },
  { value: "gourmet", label: "グルメ" },
  { value: "nature", label: "自然" },
  { value: "experience", label: "体験" },
  { value: "street", label: "街歩き" },
  { value: "hotel", label: "宿" },
  { value: "transport", label: "移動" },
  { value: "other", label: "その他" },
];

const COST_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: "費用感：すべて" },
  { value: "free", label: "無料" },
  { value: "cheap", label: "安い" },
  { value: "normal", label: "普通" },
  { value: "expensive", label: "高め" },
];

const DURATION_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: "所要時間：すべて" },
  { value: "10min", label: "10分" },
  { value: "30min", label: "30分" },
  { value: "1hour", label: "1時間" },
  { value: "halfday", label: "半日" },
];

// ── スポットカード ─────────────────────────────────────────
const IMPRESSIONS_PREVIEW = 2;

function SpotCard({
  spot,
  expanded,
  onToggle,
}: {
  spot: any;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasMore = spot.impressions.length > IMPRESSIONS_PREVIEW;
  const visible: any[] = expanded
    ? spot.impressions
    : spot.impressions.slice(0, IMPRESSIONS_PREVIEW);

  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      {/* サムネイル */}
      {spot.photos.length > 0 && (
        <img
          src={spot.photos[0]}
          alt={spot.placeName}
          className="w-full h-36 object-cover"
        />
      )}

      <div className="p-3 space-y-2">
        {/* 名前 + 件数バッジ */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-base leading-tight">{spot.placeName}</p>
          {spot.tripCount > 1 && (
            <Badge variant="secondary" className="flex-shrink-0 text-xs gap-1">
              <Users className="h-3 w-3" />
              {spot.tripCount}件の旅記録
            </Badge>
          )}
        </div>

        {/* タグ行 */}
        <div className="flex flex-wrap gap-1.5">
          {spot.category && (
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABELS[spot.category] ?? spot.category}
            </Badge>
          )}
          {spot.cost && (
            <Badge variant="outline" className="text-xs">
              {COST_LABELS[spot.cost] ?? spot.cost}
            </Badge>
          )}
          {spot.duration && (
            <Badge variant="outline" className="text-xs">
              {DURATION_LABELS[spot.duration] ?? spot.duration}
            </Badge>
          )}
        </div>

        {/* 平均評価 */}
        {spot.avgRating != null && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-3.5 w-3.5 ${
                  star <= Math.round(spot.avgRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-200"
                }`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              {spot.avgRating.toFixed(1)}（{spot.ratingCount}件の評価）
            </span>
          </div>
        )}

        {/* 感想一覧 */}
        {spot.impressions.length > 0 && (
          <div className="space-y-1.5 border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground">みんなの感想</p>
            {visible.map((imp: any, i: number) => (
              <div key={i} className="bg-muted/40 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-foreground mb-0.5">{imp.userName}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{imp.text}</p>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={onToggle}
                className="flex items-center gap-1 text-xs text-primary font-medium pt-0.5"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    閉じる
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    もっと見る（あと{spot.impressions.length - IMPRESSIONS_PREVIEW}件）
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── メインコンポーネント ───────────────────────────────────
export default function CityHub() {
  const [, params] = useRoute("/browse/:cityId");
  const cityId = params?.cityId ? decodeURIComponent(params.cityId) : "";
  const cityNameOnly = cityId.split("-")[0] || cityId;

  const [activeTab, setActiveTab] = useState<"trips" | "spots">("trips");

  // 旅記録タブ
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // スポットタブ
  const [spotCategory, setSpotCategory] = useState<string | null>(null);
  const [spotCost, setSpotCost] = useState<string | null>(null);
  const [spotDuration, setSpotDuration] = useState<string | null>(null);
  const [expandedSpots, setExpandedSpots] = useState<Set<string>>(new Set());

  // ── データ取得 ────────────────────────────────────────
  const { data: cityData } = useQuery({
    queryKey: ["/api/discover/cities", cityId],
    queryFn: async () => {
      const res = await fetch(`/api/discover/cities/${encodeURIComponent(cityId)}`);
      if (!res.ok) throw new Error("Failed to fetch city");
      return res.json();
    },
    enabled: !!cityId,
  });

  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["/api/trips", "city", cityNameOnly],
    queryFn: async () => {
      const p = new URLSearchParams({ city: cityNameOnly, status: "PUBLISHED" });
      const res = await fetch(`/api/trips?${p}`);
      if (!res.ok) throw new Error("Failed to fetch trips");
      return res.json();
    },
    enabled: !!cityNameOnly && activeTab === "trips",
  });

  const { data: groupedSpots, isLoading: spotsLoading } = useQuery({
    queryKey: ["/api/discover/cities", cityId, "grouped-spots"],
    queryFn: async () => {
      const res = await fetch(
        `/api/discover/cities/${encodeURIComponent(cityId)}/grouped-spots`
      );
      if (!res.ok) throw new Error("Failed to fetch grouped spots");
      return res.json();
    },
    enabled: !!cityId && activeTab === "spots",
  });

  // ── 表示名 ────────────────────────────────────────────
  const cityName = cityData?.name || cityId;
  const country = cityData?.country || "";
  const displayName = country ? `${cityName}・${country}` : cityName;

  // ── フィルタリング ────────────────────────────────────
  const filteredTrips =
    trips?.items?.filter((trip: any) => {
      if (
        selectedCategory &&
        trip.companyType?.toLowerCase() !== selectedCategory.toLowerCase()
      )
        return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        trip.title?.toLowerCase().includes(q) ||
        trip.summary?.toLowerCase().includes(q)
      );
    }) ?? [];

  const filteredSpots = (groupedSpots ?? []).filter((spot: any) => {
    if (spotCategory && spot.category !== spotCategory) return false;
    if (spotCost && spot.cost !== spotCost) return false;
    if (spotDuration && spot.duration !== spotDuration) return false;
    return true;
  });

  const toggleSpot = (key: string) => {
    setExpandedSpots((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── UI ───────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <Link href="/browse">
            <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900 truncate">{displayName}</h1>
        </div>
      </div>

      {/* タブ */}
      <div className="flex border-b px-4">
        {(["trips", "spots"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {tab === "trips" ? "旅記録" : "スポット"}
          </button>
        ))}
      </div>

      {/* ══ 旅記録タブ ══════════════════════════════════ */}
      {activeTab === "trips" && (
        <>
          <div className="px-4 pt-3 pb-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="旅記録を検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-gray-100 border-0"
                data-testid="input-trip-search"
              />
            </div>
          </div>

          <CategoryChips
            categories={DEFAULT_CATEGORIES}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />

          <main className="flex-1 px-4 py-4 pb-24">
            {tripsLoading ? (
              <LoadingSpinner className="py-16" />
            ) : !filteredTrips.length ? (
              <EmptyState
                icon={MapPin}
                title="旅記録がありません"
                description={
                  selectedCategory
                    ? "このカテゴリの旅記録はありません"
                    : "この都市の旅記録はまだありません"
                }
              />
            ) : (
              <div className="space-y-4">
                {filteredTrips.map((trip: any) => (
                  <TripCard
                    key={trip.id}
                    id={trip.id}
                    title={trip.title}
                    city={trip.city}
                    country={trip.country}
                    thumbnailUrl={trip.heroUrl || trip.spots?.[0]?.photos?.[0]?.url || null}
                    peopleCount={trip.peopleCount}
                    companyType={trip.companyType}
                    publishedAt={trip.publishedAt}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {/* ══ スポットタブ ══════════════════════════════════ */}
      {activeTab === "spots" && (
        <>
          {/* フィルター */}
          <div className="px-4 pt-3 space-y-2">
            {/* カテゴリ */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {SPOT_CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setSpotCategory(opt.value)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    spotCategory === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 費用感 */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {COST_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setSpotCost(opt.value)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    spotCost === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 所要時間 */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setSpotDuration(opt.value)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    spotDuration === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* スポット件数 */}
          {!spotsLoading && filteredSpots.length > 0 && (
            <p className="px-4 pt-2 text-xs text-muted-foreground">
              {filteredSpots.length}件のスポット
            </p>
          )}

          <main className="flex-1 px-4 py-3 pb-24">
            {spotsLoading ? (
              <LoadingSpinner className="py-16" />
            ) : !filteredSpots.length ? (
              <EmptyState
                icon={MapPin}
                title="スポットがありません"
                description="条件に合うスポットがありません"
              />
            ) : (
              <div className="space-y-4">
                {filteredSpots.map((spot: any) => (
                  <SpotCard
                    key={spot.key}
                    spot={spot}
                    expanded={expandedSpots.has(spot.key)}
                    onToggle={() => toggleSpot(spot.key)}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}
