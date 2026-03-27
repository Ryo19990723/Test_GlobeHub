import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Filter, X } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { SearchBar } from "@/components/browsing/SearchBar";
import { FilterPanel } from "@/components/browsing/FilterPanel";
import { TripCard } from "@/components/browsing/TripCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api";

export default function Search() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  
  const [searchQuery, setSearchQuery] = useState(params.get("q") || "");
  const [filters, setFilters] = useState({
    city: params.get("city") || "",
    category: params.get("category") || "",
    purpose: params.get("purpose") || "",
  });
  const [page, setPage] = useState(1);

  const { data: trips, isLoading } = useQuery({
    queryKey: ["/api/search/trips", searchQuery, filters, page],
    queryFn: () =>
      api.search.trips({
        query: searchQuery || undefined,
        city: filters.city || undefined,
        category: filters.category || undefined,
        purpose: filters.purpose || undefined,
        page,
        pageSize: 12,
      }),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchQuery(params.get("q") || "");
  }, [location]);

  const handleSearch = () => {
    setPage(1);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilter = (key: string) => {
    setFilters((prev) => ({ ...prev, [key]: "" }));
    setPage(1);
  };

  const handleClearAll = () => {
    setFilters({ city: "", category: "", purpose: "" });
    setPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader title="検索結果" showBack backPath="/browse" />

      <main className="flex-1">
        <div className="bg-gradient-to-b from-primary/5 to-background py-6 px-4">
          <div className="max-w-2xl mx-auto">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
            />
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="flex gap-8">
            {/* Desktop Filter Panel */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <FilterPanel
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilter={handleClearFilter}
                  onClearAll={handleClearAll}
                />
              </div>
            </aside>

            {/* Mobile Filter Sheet */}
            <div className="lg:hidden fixed bottom-6 right-6 z-50">
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="lg" className="gap-2 rounded-full shadow-lg">
                    <Filter className="h-5 w-5" />
                    フィルタ
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <FilterPanel
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilter={handleClearFilter}
                    onClearAll={handleClearAll}
                    className="pt-6"
                  />
                </SheetContent>
              </Sheet>
            </div>

            {/* Results */}
            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {trips ? `${trips.total} 件の旅記録が見つかりました` : "検索中..."}
                </p>
              </div>

              {isLoading ? (
                <LoadingSpinner className="py-16" />
              ) : !trips?.items?.length ? (
                <EmptyState
                  icon={X}
                  title="旅記録が見つかりませんでした"
                  description="検索条件を変えて再度お試しください"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
