import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CityCard } from "@/components/common/CityCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";

export default function CityList() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: cities, isLoading } = useQuery({
    queryKey: ["/api/discover/cities"],
    queryFn: async () => {
      const response = await fetch('/api/discover/cities');
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json();
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/browse/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const allCities = [
    ...(cities?.recent || []),
    ...(cities?.recommended || []),
    ...(cities?.campaign || []),
  ].filter((city, index, self) => 
    index === self.findIndex(c => c.id === city.id)
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900 mb-4">場所を探す</h1>
        
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="都市や国で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-gray-100 border-0"
              data-testid="input-city-search"
            />
          </div>
        </form>
      </div>

      <main className="flex-1 px-4 py-4">
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : !allCities.length ? (
          <EmptyState
            icon={MapPin}
            title="都市がありません"
            description="まだ公開されている都市がありません"
          />
        ) : (
          <div className="space-y-6">
            {cities?.recent?.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">最近見た場所</h2>
                <div className="grid grid-cols-2 gap-3">
                  {cities.recent.slice(0, 4).map((city: any) => (
                    <CityCard
                      key={city.id}
                      cityId={city.id}
                      cityName={city.name}
                      country={city.country}
                      imageUrl={city.heroUrl}
                      tripCount={city.tripCount || 0}
                    />
                  ))}
                </div>
              </section>
            )}

            {cities?.recommended?.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">あなたへのおすすめ</h2>
                <div className="grid grid-cols-2 gap-3">
                  {cities.recommended.map((city: any) => (
                    <CityCard
                      key={city.id}
                      cityId={city.id}
                      cityName={city.name}
                      country={city.country}
                      imageUrl={city.heroUrl}
                      tripCount={city.tripCount || 0}
                    />
                  ))}
                </div>
              </section>
            )}

            {cities?.campaign?.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">特集</h2>
                <div className="grid grid-cols-2 gap-3">
                  {cities.campaign.map((city: any) => (
                    <CityCard
                      key={city.id}
                      cityId={city.id}
                      cityName={city.name}
                      country={city.country}
                      imageUrl={city.heroUrl}
                      tripCount={city.tripCount || 0}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
