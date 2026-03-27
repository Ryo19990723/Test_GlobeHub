import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Notebook } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { useState, useEffect } from "react";
import { getRecentTripIds, addToRecentTrips } from "@/lib/recentTrips";

interface TripCardCompact {
  id: string;
  title: string;
  city?: string | null;
  country?: string | null;
  heroUrl?: string | null;
  spots?: { photos?: { url: string }[] }[];
}

function TripThumbnail({ trip }: { trip: TripCardCompact }) {
  const imageUrl = trip.heroUrl || trip.spots?.[0]?.photos?.[0]?.url;
  const location = [trip.city, trip.country].filter(Boolean).join(" · ");

  return (
    <Link href={`/trips/${trip.id}`} onClick={() => addToRecentTrips(trip.id)}>
      <div
        className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 w-40 cursor-pointer"
        data-testid={`trip-thumbnail-${trip.id}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={trip.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <MapPin className="h-8 w-8 text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 text-white">
          <p className="text-sm font-semibold truncate drop-shadow">{trip.title}</p>
          {location && (
            <p className="text-xs opacity-90 truncate">
              <MapPin className="inline h-3 w-3 mr-0.5" />
              {location}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function TripSection({
  title,
  trips,
  emptyMessage,
}: {
  title: string;
  trips: TripCardCompact[];
  emptyMessage?: string;
}) {
  if (!trips || trips.length === 0) {
    if (!emptyMessage) return null;
    return (
      <section className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">{title}</h2>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {trips.map((trip) => (
          <TripThumbnail key={trip.id} trip={trip} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentIds(getRecentTripIds());
  }, []);

  const { data: feed, isLoading } = useQuery({
    queryKey: ["/api/home/feed", recentIds.slice(0, 10).join(",")],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (recentIds.length > 0) {
        params.set("recentIds", recentIds.slice(0, 10).join(","));
      }
      const response = await fetch(`/api/home/feed?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch feed");
      return response.json();
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/browse/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">GlobeHub</h1>
        </div>

        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="旅を検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-gray-100 border-0"
              data-testid="input-home-search"
            />
          </div>
        </form>

        <Link href="/record">
          <Card className="bg-[#7C3AED] rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border-0 mb-6">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Notebook className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">旅を記録する</h2>
                <p className="text-sm text-white/80">肩の力を抜いて記録</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <main className="pb-20">
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : !feed ? (
          <EmptyState
            icon={MapPin}
            title="旅記録がありません"
            description="まだ公開されている旅記録がありません"
          />
        ) : (
          <div className="px-4">
            <TripSection
              title="最近見た旅記録"
              trips={feed.recent}
            />

            <TripSection
              title="最新の旅記録"
              trips={feed.latest}
            />

            <TripSection
              title="あなたへのおすすめ"
              trips={feed.recommended}
            />

            <TripSection
              title="保存した旅記録"
              trips={feed.saved}
            />

            {feed.latest?.length === 0 &&
              feed.recent?.length === 0 &&
              feed.recommended?.length === 0 &&
              feed.saved?.length === 0 && (
                <EmptyState
                  icon={MapPin}
                  title="旅記録がありません"
                  description="まだ公開されている旅記録がありません"
                />
              )}
          </div>
        )}
      </main>
    </div>
  );
}
