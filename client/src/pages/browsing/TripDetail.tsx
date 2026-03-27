import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { 
  MapPin, Calendar, Users, Briefcase, X, ArrowLeft, Heart, Bookmark, Share2,
  ChevronDown, ChevronUp, Star, Clock, Wallet, Shield, Bus, Lightbulb, HeartHandshake
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { addToRecentTrips } from "@/lib/recentTrips";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const COMPANY_TYPE_LABELS: Record<string, string> = {
  solo: "ひとり旅",
  couple: "カップル",
  family: "家族",
  friend: "友人",
  friends: "友人",
  business: "ビジネス",
  group: "グループ",
};

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
  "halfday": "半日",
};

function SpotCard({ spot, index }: { spot: any; index: number }) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photos = spot.photos || [];
  const hasPhotos = photos.length > 0;
  const hasTags = spot.cost || spot.duration;

  const nextPhoto = () => {
    if (photos.length > 1) setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };
  const prevPhoto = () => {
    if (photos.length > 1) setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden" data-testid={`spot-card-${spot.id}`}>
      {/* ── ヘッダー: 名前 + カテゴリ ── */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight">
              {spot.placeName || spot.name || `スポット ${index + 1}`}
            </h3>
            {spot.address && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{spot.address}</span>
              </p>
            )}
          </div>
          {spot.category && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {CATEGORY_LABELS[spot.category] || spot.category}
            </Badge>
          )}
        </div>
      </div>

      {/* ── 写真カルーセル ── */}
      {hasPhotos && (
        <div className="relative aspect-[4/3] bg-muted">
          <img
            src={photos[currentPhotoIndex]?.url}
            alt={spot.placeName || spot.name}
            className="w-full h-full object-cover"
            onClick={nextPhoto}
          />
          {photos.length > 1 && (
            <>
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {currentPhotoIndex + 1}/{photos.length}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full"
                data-testid={`button-prev-photo-${spot.id}`}
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full"
                data-testid={`button-next-photo-${spot.id}`}
              >
                <ChevronUp className="h-4 w-4 rotate-90" />
              </button>
            </>
          )}
        </div>
      )}

      {/* ── メタ情報: おすすめ度 + タグ ── */}
      {(spot.rating > 0 || hasTags) && (
        <div className="px-4 pt-3 pb-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          {spot.rating > 0 && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${star <= spot.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                />
              ))}
            </div>
          )}
          {spot.cost && (
            <Badge variant="outline" className="gap-1 text-xs font-normal">
              <Wallet className="h-3 w-3" />
              {COST_LABELS[spot.cost] || spot.cost}
            </Badge>
          )}
          {spot.duration && (
            <Badge variant="outline" className="gap-1 text-xs font-normal">
              <Clock className="h-3 w-3" />
              {DURATION_LABELS[spot.duration] || spot.duration}
            </Badge>
          )}
        </div>
      )}

      {/* ── 感想テキスト（音声入力） ── */}
      {spot.impressionRemarks && (
        <div className="px-4 pb-4 pt-2">
          <div className="bg-muted/40 rounded-xl px-4 py-3 border border-border/40">
            <p className="text-sm leading-relaxed text-foreground">{spot.impressionRemarks}</p>
          </div>
        </div>
      )}

      {/* 感想もメタ情報もない場合の余白 */}
      {!spot.impressionRemarks && !(spot.rating > 0 || hasTags) && (
        <div className="pb-2" />
      )}
      {(spot.rating > 0 || hasTags) && !spot.impressionRemarks && (
        <div className="pb-3" />
      )}
    </div>
  );
}

export default function TripDetail() {
  const [, params] = useRoute("/trips/:id");
  const [, setLocation] = useLocation();
  const tripId = params?.id || "";
  const spotsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const { data: trip, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId],
    queryFn: () => api.trips.getById(tripId),
    enabled: !!tripId,
  });

  useEffect(() => {
    if (tripId) {
      addToRecentTrips(tripId);
    }
  }, [tripId]);

  const { data: relatedTrips } = useQuery({
    queryKey: ["/api/trips", "related", trip?.city],
    queryFn: async () => {
      if (!trip?.city) return { items: [] };
      const response = await fetch(`/api/trips?city=${encodeURIComponent(trip.city)}&status=PUBLISHED&pageSize=3`);
      if (!response.ok) return { items: [] };
      return response.json();
    },
    enabled: !!trip?.city,
  });

  const likeMutation = useMutation({
    mutationFn: () =>
      trip?.isLiked ? api.trips.unlike(tripId) : api.trips.like(tripId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/trips", tripId] });
      const previous = queryClient.getQueryData(["/api/trips", tripId]);
      queryClient.setQueryData(["/api/trips", tripId], (old: any) => ({
        ...old,
        isLiked: !old.isLiked,
        _count: {
          ...old._count,
          likes: old.isLiked ? old._count.likes - 1 : old._count.likes + 1,
        },
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["/api/trips", tripId], context?.previous);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      trip?.isSaved ? api.trips.unsave(tripId) : api.trips.save(tripId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/trips", tripId] });
      const previous = queryClient.getQueryData(["/api/trips", tripId]);
      queryClient.setQueryData(["/api/trips", tripId], (old: any) => ({
        ...old,
        isSaved: !old.isSaved,
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["/api/trips", tripId], context?.previous);
    },
  });

  const handleShare = async () => {
    const shareData = {
      title: trip?.title || "旅記録",
      text: trip?.summary || `${trip?.city || ""}の旅記録`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        console.log('Share cancelled or failed');
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert("リンクをコピーしました");
      } catch (e) {
        console.error('Copy failed');
      }
    }
  };

  const spotsWithCoords = (trip?.spots || []).filter((s: any) => s.lat && s.lng);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || spotsWithCoords.length === 0) return;
    if (mapInstanceRef.current) return;

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      try {
        const bounds = spotsWithCoords.map((s: any) => [s.lat, s.lng] as [number, number]);
        const map = L.map(mapRef.current).fitBounds(bounds, { padding: [30, 30] });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);
        
        spotsWithCoords.forEach((spot: any, i: number) => {
          L.marker([spot.lat, spot.lng])
            .addTo(map)
            .bindPopup(spot.placeName || spot.name || `スポット ${i + 1}`);
        });

        mapInstanceRef.current = map;
        setMapReady(true);
      } catch (e) {
        console.error('Map initialization error:', e);
      }
    };

    if ((window as any).L) {
      initMap();
    } else {
      const checkInterval = setInterval(() => {
        if ((window as any).L) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);
      
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
      }, 5000);
      
      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [spotsWithCoords.length, trip?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <Link href="/browse">
            <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">旅記録</h1>
        </div>
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <Link href="/browse">
            <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">旅記録</h1>
        </div>
        <main className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={X}
            title="旅記録が見つかりません"
            description="この旅記録は存在しないか、非公開になっています"
          />
        </main>
      </div>
    );
  }

  const heroPhoto = trip.heroUrl || trip.spots?.[0]?.photos?.[0]?.url;
  const location = [trip.city, trip.country].filter(Boolean).join("・");
  const companyLabel = trip.companyType ? COMPANY_TYPE_LABELS[trip.companyType.toLowerCase()] || trip.companyType : null;
  
  const formatDateRange = () => {
    if (!trip.startDate && !trip.endDate) return null;
    const start = trip.startDate ? format(new Date(trip.startDate), "yyyy/MM/dd", { locale: ja }) : null;
    const end = trip.endDate ? format(new Date(trip.endDate), "MM/dd", { locale: ja }) : null;
    if (start && end) return `${start}–${end}`;
    return start || end;
  };

  const dateRange = formatDateRange();
  const hasSummaryContent = trip.safetyTips || trip.transportTips || trip.travelTips || trip.memorableMoment;
  const spots = trip.spots || [];
  const otherTrips = relatedTrips?.items?.filter((t: any) => t.id !== tripId) || [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur px-4 py-2 flex items-center gap-3 border-b">
        <Link href="/browse">
          <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1">{trip.title}</h1>
      </div>

      <main className="flex-1">
        {heroPhoto && (
          <div className="relative aspect-[16/9] overflow-hidden bg-muted">
            <img
              src={heroPhoto}
              alt={trip.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h2 className="text-2xl font-bold mb-1 drop-shadow-lg">{trip.title}</h2>
              {location && (
                <p className="text-sm opacity-90 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {location}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white px-4 py-4 border-b">
          <div className="flex flex-wrap gap-2 mb-4">
            {dateRange && (
              <Badge variant="secondary" className="gap-1">
                <Calendar className="h-3 w-3" />
                {dateRange}
              </Badge>
            )}
            {trip.peopleCount && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {trip.peopleCount}人
              </Badge>
            )}
            {companyLabel && (
              <Badge variant="secondary" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {companyLabel}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={trip.isLiked ? "default" : "outline"}
                size="sm"
                onClick={() => likeMutation.mutate()}
                className="gap-1"
                data-testid="button-like"
              >
                <Heart className={`h-4 w-4 ${trip.isLiked ? "fill-current" : ""}`} />
                {trip._count?.likes || 0}
              </Button>
              <Button
                variant={trip.isSaved ? "default" : "outline"}
                size="sm"
                onClick={() => saveMutation.mutate()}
                className="gap-1"
                data-testid="button-save"
              >
                <Bookmark className={`h-4 w-4 ${trip.isSaved ? "fill-current" : ""}`} />
                保存
              </Button>
              <Button variant="outline" size="sm" className="gap-1" data-testid="button-share" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            {trip.author && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {(trip.author.displayName || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{trip.author.displayName || "ユーザー"}</span>
              </div>
            )}
          </div>
        </div>

        {hasSummaryContent && (
          <div className="bg-white border-t px-4 py-6 space-y-6">
            <h3 className="text-lg font-bold">都市のまとめ</h3>
            
            {trip.safetyTips && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold">安全に旅するためのポイント</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{trip.safetyTips}</p>
              </div>
            )}
            
            {trip.transportTips && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Bus className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold">移動手段のポイント</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{trip.transportTips}</p>
              </div>
            )}
            
            {trip.travelTips && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold">次の旅人に伝えたいコツ</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{trip.travelTips}</p>
              </div>
            )}
            
            {trip.memorableMoment && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold">心に残った瞬間</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{trip.memorableMoment}</p>
              </div>
            )}
          </div>
        )}

        {spots.length > 0 && (
          <div ref={spotsRef} className="px-4 py-6">
            <h3 className="text-lg font-bold mb-4">スポット ({spots.length})</h3>
            <div className="space-y-4">
              {spots.map((spot: any, index: number) => (
                <SpotCard key={spot.id} spot={spot} index={index} />
              ))}
            </div>
          </div>
        )}

        {spotsWithCoords.length > 0 && (
          <div className="px-4 py-6 bg-white border-t">
            <h3 className="text-lg font-bold mb-4">地図で見る</h3>
            <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden relative">
              <div 
                id="trip-map" 
                className="w-full h-full"
                ref={mapRef}
              />
              {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{spotsWithCoords.length}スポットの位置情報</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-4 py-6 bg-white border-t">
          {trip.author && (
            <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {(trip.author.displayName || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{trip.author.displayName || "ユーザー"}</p>
                <p className="text-sm text-muted-foreground">この旅記録の投稿者</p>
              </div>
            </div>
          )}

          {otherTrips.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3">{trip.city}の他の旅記録</h3>
              <div className="space-y-3">
                {otherTrips.slice(0, 3).map((t: any) => (
                  <Link key={t.id} href={`/trips/${t.id}`}>
                    <div className="flex gap-3 p-3 bg-gray-50 rounded-xl hover-elevate cursor-pointer" data-testid={`related-trip-${t.id}`}>
                      {(t.heroUrl || t.spots?.[0]?.photos?.[0]?.url) && (
                        <img
                          src={t.heroUrl || t.spots?.[0]?.photos?.[0]?.url}
                          alt={t.title}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{t.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{t.summary}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {trip.city && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation(`/browse/${encodeURIComponent(trip.city + "-" + (trip.country || ""))}`)}
              data-testid="button-view-city"
            >
              {trip.city}の記録を見る
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
