import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { SpotPicker } from "@/components/recording/SpotPicker";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { saveSpotLocation } from "@/lib/api";
import { CITIES_MASTER } from "@/data/cities";

export default function SpotLocation() {
  const [, params] = useRoute("/record/:tripId/spot/loc");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const tripId = params?.tripId || "";
  const searchParams = new URLSearchParams(window.location.search);
  const spotId = searchParams.get("spotId") || "";
  const returnTo = searchParams.get("returnTo") || "";

  const [hasPhotoGps, setHasPhotoGps] = useState<boolean | null>(null);
  const [photoMeta, setPhotoMeta] = useState<{ lat: number; lng: number; allPoints?: {lat: number; lng: number}[] } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [cityLat, setCityLat] = useState<number | undefined>(undefined);
  const [cityLng, setCityLng] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!tripId) {
      toast({ title: "エラー", description: "旅記録が見つかりません", variant: "destructive" });
      setLocation("/");
    }
  }, [tripId, toast, setLocation]);

  const { data: spot, isLoading: isLoadingSpot, isFetching: isFetchingSpot } = useQuery({
    queryKey: ["/api/spots", spotId],
    queryFn: async () => {
      const res = await fetch(`/api/spots/${spotId}`);
      if (!res.ok) throw new Error("Failed to fetch spot");
      return res.json();
    },
    enabled: !!spotId,
  });

  const { data: trip } = useQuery({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch trip");
      return res.json();
    },
    enabled: !!tripId,
  });

  // 旅の都市座標を取得（検索バイアス用）
  useEffect(() => {
    if (trip?.city) {
      const cityData = CITIES_MASTER.find(c =>
        c.cityJp === trip.city || c.cityEn === trip.city
      );
      if (cityData) {
        // 都市の中心座標を取得するためNominatimを使用（簡易的にcities.tsに座標がないためスキップ）
        // フォールバック：旅のスポットが既にある場合はその座標を使用
        if (trip.spots && trip.spots.length > 0) {
          const firstSpotWithCoords = trip.spots.find((s: any) => s.lat && s.lng);
          if (firstSpotWithCoords) {
            setCityLat(firstSpotWithCoords.lat);
            setCityLng(firstSpotWithCoords.lng);
          }
        }
      }
    }
  }, [trip]);

  useEffect(() => {
    // isLoadingSpot: 初回ロード中, isFetchingSpot: 再フェッチ中（写真アップ直後など）
    // どちらの場合も安定したデータが届くまで待つ
    if (!spotId || isLoadingSpot || isFetchingSpot) return;

    if (spot && (!spot.photos || spot.photos.length === 0)) {
      toast({ title: "写真を追加してください", description: "先に写真を1枚以上追加してください" });
      setLocation(`/record/${tripId}/spot/photo?spotId=${spotId}${returnTo ? `&returnTo=${returnTo}` : ''}`, { replace: true });
      return;
    }

    // sessionStorageからphotoMetaを取得
    const stored = sessionStorage.getItem(`spot_${spotId}_photoMeta`);
    if (stored) {
      try {
        const meta = JSON.parse(stored);
        if (meta && typeof meta.lat === 'number' && typeof meta.lng === 'number') {
          setPhotoMeta(meta);
          setHasPhotoGps(true);
        } else {
          setPhotoMeta(null);
          setHasPhotoGps(false);
        }
      } catch (e) {
        setPhotoMeta(null);
        setHasPhotoGps(false);
      }
    } else {
      setPhotoMeta(null);
      setHasPhotoGps(false);
    }

    setIsReady(true);
  }, [spot, spotId, tripId, isLoadingSpot, isFetchingSpot, toast, setLocation, returnTo]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, []);

  const handleSelectCandidate = async (candidate: any) => {
    if (isSubmitting) return;
    if (!candidate.lat || !candidate.lng) {
      toast({ title: "エラー", description: "位置情報が不正です", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      spotId: spotId!,
      lat: Number(candidate.lat),
      lng: Number(candidate.lng),
      name: candidate.name || undefined,
      placeName: candidate.name || undefined,
      address: candidate.address || undefined,
      locationSource: candidate.source,
    };

    abortControllerRef.current = new AbortController();

    try {
      await saveSpotLocation(payload, abortControllerRef.current.signal);
      sessionStorage.removeItem(`spot_${spotId}_photoMeta`);
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/spots", spotId] });
      // ポップアップなしで直接遷移
      const detailSearch = `?spotId=${spotId}${returnTo ? `&returnTo=${returnTo}` : ''}`;
      setLocation(`/record/${tripId}/spot/detail${detailSearch}`);
    } catch (error: any) {
      // オフライン保存して遷移
      const draftKey = `spot_${spotId}_locationDraft`;
      sessionStorage.setItem(draftKey, JSON.stringify({ ...payload, offline: true, savedAt: Date.now() }));
      const detailSearch = `?spotId=${spotId}${returnTo ? `&returnTo=${returnTo}` : ''}`;
      setLocation(`/record/${tripId}/spot/detail${detailSearch}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="位置を選択" showBack backPath={`/record/${tripId}`} />
        <main className="flex-1 flex items-center justify-center"><LoadingSpinner /></main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader title="位置を選択" showBack backPath={`/record/${tripId}`} />

      <main className="flex-1 px-4 py-6">
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <p className="text-sm">スポットを選択してください</p>
          </div>

          {hasPhotoGps && photoMeta && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 text-sm text-primary">
                <MapPin className="h-4 w-4" />
                <span>写真の位置情報を検出しました。写真タブで候補を確認できます。</span>
              </div>
            </div>
          )}

          {!hasPhotoGps && (
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>現在地または検索で位置を選択してください。</span>
              </div>
            </div>
          )}

          <SpotPicker
            onSelect={handleSelectCandidate}
            defaultTab={hasPhotoGps ? "photo" : "search"}
            spotId={spotId}
            photoGpsLocations={photoMeta?.allPoints ?? (photoMeta ? [{ lat: photoMeta.lat, lng: photoMeta.lng }] : [])}
            {...(cityLat !== undefined ? { cityLat } : {})}
            {...(cityLng !== undefined ? { cityLng } : {})}
            disablePhotoTab={!hasPhotoGps}
            isSubmitting={isSubmitting}
          />
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation(`/record/${tripId}`)}
              data-testid="button-save-exit"
            >
              保存して終了
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
