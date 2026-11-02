import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Camera, Sparkles, Globe, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { useState, useEffect } from "react";
import { getRecentTripIds, addToRecentTrips } from "@/lib/recentTrips";
import { useAuth } from "@/hooks/useAuth";
import { useMyTrips } from "@/hooks/useMyTrips";

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
        className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 w-44 cursor-pointer transition-transform duration-200 active:scale-95"
        style={{ boxShadow: "0 4px 16px hsl(257 56% 31% / 0.12)" }}
        data-testid={`trip-thumbnail-${trip.id}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={trip.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#EDE9FE]">
            <MapPin className="h-8 w-8 text-[#3C237D]/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
          <p className="text-sm font-semibold truncate drop-shadow-sm leading-tight">{trip.title}</p>
          {location && (
            <p className="text-[11px] opacity-85 truncate mt-0.5 flex items-center gap-0.5">
              <MapPin className="inline h-2.5 w-2.5 flex-shrink-0" />
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
      <section className="mb-7">
        <h2 className="text-[15px] font-semibold text-[#1E1B4B] mb-3">{title}</h2>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-[#1E1B4B]">{title}</h2>
        <Link href="/browse">
          <span className="text-xs font-medium text-[#3C237D] flex items-center gap-0.5 active:opacity-70">
            すべて見る <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
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
  const { isLoggedIn } = useAuth();
  const { active } = useMyTrips();
  const current = active[0]; // most recently started

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
      {/* Brand header strip */}
      <div
        className="px-4 pt-5 pb-5"
        style={{
          background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)",
        }}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="text-[22px] font-bold text-white tracking-tight">GlobeHub</span>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3C237D]/60" />
            <Input
              type="text"
              placeholder="旅先・スポットを検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white border-0 rounded-full text-sm shadow-sm placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-white/50"
              data-testid="input-home-search"
            />
          </div>
        </form>
      </div>

      {/* Main action: continue the trip in progress, or start one */}
      <div className="px-4 pt-4 pb-1 bg-white space-y-3">
        {current ? (
          <Link href={`/record/${current.id}`}>
            <div
              className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: "0 6px 20px hsl(257 56% 31% / 0.30)" }}
              data-testid="button-continue-trip"
            >
              <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/75">旅の続きを記録</p>
                <p className="text-base font-bold text-white truncate">{current.title}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/70 shrink-0" />
            </div>
          </Link>
        ) : (
          <Link href={isLoggedIn ? "/record/new" : "/record"}>
            <div
              className="rounded-2xl p-5 cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)", boxShadow: "0 6px 20px hsl(257 56% 31% / 0.30)" }}
              data-testid="button-start-trip"
            >
              <p className="text-lg font-bold text-white">撮って、ひとこと話すだけ。</p>
              <p className="text-xs text-white/80 mt-1">旅が終わると、AIが旅行記にまとめます</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white text-[#3C237D] px-4 py-2 text-sm font-semibold">
                <Camera className="h-4 w-4" /> 旅を始める
              </div>
            </div>
          </Link>
        )}

        <Link href="/plan">
          <div className="rounded-2xl border border-[#EDE9FE] px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-gray-50">
            <Sparkles className="w-5 h-5 text-[#F97316] shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1E1B4B]">AI旅行計画</p>
              <p className="text-xs text-muted-foreground">次の旅をAIが提案</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      </div>

      {/* Feed sections */}
      <main className="pb-24 pt-4">
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : !feed ? (
          <EmptyState
            icon={MapPin}
            title="まだ旅行記がありません"
            description="最初の旅行記をつくってみませんか"
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
                  title="まだ旅行記がありません"
                  description="最初の旅行記をつくってみませんか"
                />
              )}
          </div>
        )}
      </main>
    </div>
  );
}
