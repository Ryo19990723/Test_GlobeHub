
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/browsing/SearchBar";
import { TripCard } from "@/components/browsing/TripCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Compass, ChevronLeft, ChevronRight, Globe2, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type TabType = "cities" | "new" | "popular";

const tabs: { value: TabType; label: string; testId: string }[] = [
  { value: "cities", label: "都市一覧", testId: "tab-cities" },
  { value: "new",    label: "新着",     testId: "tab-new" },
  { value: "popular",label: "人気",     testId: "tab-popular" },
];

function CityGrid({ cities }: { cities: any[] }) {
  const [, setLocation] = useLocation();
  return (
    <div className="grid grid-cols-2 gap-3">
      {cities.map((city: any) => (
        <div
          key={city.id}
          onClick={() => setLocation(`/discover/${city.id}`)}
          className="cursor-pointer group active:scale-95 transition-transform duration-150"
        >
          <div
            className="aspect-[4/3] rounded-2xl overflow-hidden mb-2 relative"
            style={{ boxShadow: "0 4px 12px hsl(257 56% 31% / 0.10)" }}
          >
            {city.heroUrl ? (
              <img
                src={city.heroUrl}
                alt={city.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-[#EDE9FE] flex items-center justify-center">
                <MapPin className="h-8 w-8 text-[#3C237D]/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
              <p className="text-sm font-semibold truncate leading-tight">{city.name}</p>
              <p className="text-[11px] opacity-80 truncate">{city.country}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground px-0.5">{city.tripCount}件の旅記録</p>
        </div>
      ))}
    </div>
  );
}

export default function Browse() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("cities");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data: cities, isLoading: citiesLoading } = useQuery({
    queryKey: ["/api/discover/cities"],
    queryFn: async () => {
      const response = await fetch('/api/discover/cities');
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json();
    },
    enabled: activeTab === "cities",
  });

  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["/api/trips", activeTab, page],
    queryFn: () =>
      api.trips.getAll({
        status: "PUBLISHED",
        sort: activeTab === "new" ? "new" : "popular",
        page,
        pageSize: 12,
      }),
    enabled: activeTab !== "cities",
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setLocation(`/browse/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const totalPages = trips ? Math.ceil(trips.total / 12) : 1;
  const isLoading = activeTab === "cities" ? citiesLoading : tripsLoading;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Hero header */}
      <div
        className="px-4 pt-5 pb-6"
        style={{
          background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Globe2 className="w-5 h-5 text-white/80" />
          <span className="text-base font-semibold text-white">見つける</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4 leading-tight">
          世界中の旅を発見
        </h1>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
        />
      </div>

      {/* Pill tab bar */}
      <div className="px-4 py-3 bg-white border-b border-[#EDE9FE] sticky top-0 z-10">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              data-testid={tab.testId}
              onClick={() => { setActiveTab(tab.value); setPage(1); }}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95",
                activeTab === tab.value
                  ? "bg-[#3C237D] text-white shadow-sm"
                  : "bg-[#F3F0FF] text-[#3C237D]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-4 py-5 pb-24">
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : activeTab === "cities" ? (
          <div className="space-y-7">
            {cities?.recent?.length > 0 && (
              <section>
                <h2 className="text-[15px] font-semibold text-[#1E1B4B] mb-3">最近見た都市</h2>
                <CityGrid cities={cities.recent} />
              </section>
            )}
            {cities?.recommended?.length > 0 && (
              <section>
                <h2 className="text-[15px] font-semibold text-[#1E1B4B] mb-3">あなたへのおすすめ</h2>
                <CityGrid cities={cities.recommended} />
              </section>
            )}
            {cities?.campaign?.length > 0 && (
              <section>
                <h2 className="text-[15px] font-semibold text-[#1E1B4B] mb-3">キャンペーン中</h2>
                <CityGrid cities={cities.campaign} />
              </section>
            )}
            {!cities?.recent?.length && !cities?.recommended?.length && !cities?.campaign?.length && (
              <EmptyState
                icon={Compass}
                title="都市がありません"
                description="まだ公開されている都市がありません"
              />
            )}
          </div>
        ) : !trips?.items?.length ? (
          <EmptyState
            icon={Compass}
            title="旅記録がありません"
            description="まだ公開されている旅記録がありません"
          />
        ) : (
          <>
            <div className="space-y-4">
              {trips.items.map((trip: any) => (
                <TripCard
                  key={trip.id}
                  id={trip.id}
                  title={trip.title}
                  city={trip.city}
                  country={trip.country}
                  thumbnailUrl={trip.spots?.[0]?.photos?.[0]?.url || null}
                  spotCount={trip._count?.spots || 0}
                  likeCount={trip._count?.likes || 0}
                  isLiked={trip.isLiked}
                  isSaved={trip.isSaved}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="icon"
                        onClick={() => setPage(pageNum)}
                        data-testid={`button-page-${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
