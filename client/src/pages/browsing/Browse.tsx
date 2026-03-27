
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/common/MobileHeader";
import { SearchBar } from "@/components/browsing/SearchBar";
import { TripCard } from "@/components/browsing/TripCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Compass, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

export default function Browse() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"cities" | "new" | "popular">("cities");
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
        status: "published",
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
    <div className="min-h-screen flex flex-col">
      <MobileHeader title="見つける" />

      <main className="flex-1">
        <div className="bg-gradient-to-b from-primary/5 to-background py-8 px-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold font-serif text-center">
              世界中の旅を発見
            </h1>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
            />
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="space-y-6 max-w-2xl mx-auto">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "cities" | "new" | "popular")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cities" data-testid="tab-cities">
                  都市一覧
                </TabsTrigger>
                <TabsTrigger value="new" data-testid="tab-new">
                  新着
                </TabsTrigger>
                <TabsTrigger value="popular" data-testid="tab-popular">
                  人気
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoading ? (
              <LoadingSpinner className="py-16" />
            ) : activeTab === "cities" ? (
              // 都市一覧セクション
              <div className="space-y-8">
                {cities?.recent?.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold">最近見た都市</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {cities.recent.map((city: any) => (
                        <div
                          key={city.id}
                          onClick={() => setLocation(`/discover/${city.id}`)}
                          className="cursor-pointer group"
                        >
                          <div className="aspect-[4/3] rounded-xl overflow-hidden mb-2">
                            <img
                              src={city.heroUrl}
                              alt={city.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <h3 className="font-semibold">{city.name}</h3>
                          <p className="text-sm text-muted-foreground">{city.country}</p>
                          <p className="text-xs text-muted-foreground">{city.tripCount}件の旅記録</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cities?.recommended?.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold">あなたへのおすすめ</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {cities.recommended.map((city: any) => (
                        <div
                          key={city.id}
                          onClick={() => setLocation(`/discover/${city.id}`)}
                          className="cursor-pointer group"
                        >
                          <div className="aspect-[4/3] rounded-xl overflow-hidden mb-2">
                            <img
                              src={city.heroUrl}
                              alt={city.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <h3 className="font-semibold">{city.name}</h3>
                          <p className="text-sm text-muted-foreground">{city.country}</p>
                          <p className="text-xs text-muted-foreground">{city.tripCount}件の旅記録</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cities?.campaign?.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold">キャンペーン中</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {cities.campaign.map((city: any) => (
                        <div
                          key={city.id}
                          onClick={() => setLocation(`/discover/${city.id}`)}
                          className="cursor-pointer group"
                        >
                          <div className="aspect-[4/3] rounded-xl overflow-hidden mb-2">
                            <img
                              src={city.heroUrl}
                              alt={city.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <h3 className="font-semibold">{city.name}</h3>
                          <p className="text-sm text-muted-foreground">{city.country}</p>
                          <p className="text-xs text-muted-foreground">{city.tripCount}件の旅記録</p>
                        </div>
                      ))}
                    </div>
                  </div>
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
          </div>
        </div>
      </main>
    </div>
  );
}
