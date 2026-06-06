import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, WifiOff, AlertTriangle } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { SpotPicker } from "@/components/recording/SpotPicker";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { RecordProgress } from "@/components/recording/RecordProgress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { saveSpotLocation } from "@/lib/api";
import { CITIES_MASTER } from "@/data/cities";

function readPhotoMeta(spotId: string) {
  const key = `spot_${spotId}_photoMeta`;
  const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
  if (!raw) return null;
  try {
    const meta = JSON.parse(raw);
    if (meta && typeof meta.lat === "number" && typeof meta.lng === "number") return meta;
    return null;
  } catch {
    return null;
  }
}

export default function SpotLocation() {
  const [, params] = useRoute("/record/:tripId/spot/loc");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const tripId = params?.tripId || "";
  const searchParams = new URLSearchParams(window.location.search);
  const spotId = searchParams.get("spotId") || "";
  const returnTo = searchParams.get("returnTo") || "";

  const [hasPhotoGps, setHasPhotoGps] = useState<boolean | null>(null);
  const [photoMeta, setPhotoMeta] = useState<{ lat: number; lng: number; allPoints?: { lat: number; lng: number }[] } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [cityLat, setCityLat] = useState<number | undefined>(undefined);
  const [cityLng, setCityLng] = useState<number | undefined>(undefined);
  const [geoPermission, setGeoPermission] = useState<PermissionState | "unknown">("unknown");

  // Check geolocation permission upfront (#33)
  useEffect(() => {
    if (!("permissions" in navigator)) return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        setGeoPermission(result.state);
        result.onchange = () => setGeoPermission(result.state);
      })
      .catch(() => setGeoPermission("unknown"));
  }, []);

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

  useEffect(() => {
    if (trip?.city) {
      const cityData = CITIES_MASTER.find(
        (c) => c.cityJp === trip.city || c.cityEn === trip.city
      );
      if (cityData && trip.spots?.length > 0) {
        const firstSpotWithCoords = trip.spots.find((s: any) => s.lat && s.lng);
        if (firstSpotWithCoords) {
          setCityLat(firstSpotWithCoords.lat);
          setCityLng(firstSpotWithCoords.lng);
        }
      }
    }
  }, [trip]);

  useEffect(() => {
    if (!spotId || isLoadingSpot || isFetchingSpot) return;

    if (spot && (!spot.photos || spot.photos.length === 0)) {
      toast({ title: "写真を追加してください", description: "先に写真を1枚以上追加してください" });
      setLocation(
        `/record/${tripId}/spot/photo?spotId=${spotId}${returnTo ? `&returnTo=${returnTo}` : ""}`,
        { replace: true }
      );
      return;
    }

    // Read photoMeta from sessionStorage first, then localStorage backup (#2/#29)
    const meta = readPhotoMeta(spotId);
    if (meta) {
      setPhotoMeta(meta);
      setHasPhotoGps(true);
      // Ensure it's also in sessionStorage for SpotPicker
      sessionStorage.setItem(`spot_${spotId}_photoMeta`, JSON.stringify(meta));
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
      localStorage.removeItem(`spot_${spotId}_photoMeta`);
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/spots", spotId] });
      const detailSearch = `?spotId=${spotId}${returnTo ? `&returnTo=${returnTo}` : ""}`;
      setLocation(`/record/${tripId}/spot/detail${detailSearch}`);
    } catch (error: any) {
      // オフライン保存 (#16)
      const draftKey = `spot_${spotId}_locationDraft`;
      const draft = JSON.stringify({ ...payload, offline: true, savedAt: Date.now() });
      sessionStorage.setItem(draftKey, draft);
      try { localStorage.setItem(draftKey, draft); } catch {}
      toast({
        title: "オフラインで保存しました",
        description: "インターネット接続時に自動同期されます",
      });
      const detailSearch = `?spotId=${spotId}${returnTo ? `&returnTo=${returnTo}` : ""}`;
      setLocation(`/record/${tripId}/spot/detail${detailSearch}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const backPath = spotId
    ? `/record/${tripId}/spot/photo?spotId=${spotId}${returnTo ? `&returnTo=${returnTo}` : ""}`
    : `/record/${tripId}`;

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="位置を選択" showBack backPath={backPath} />
        <RecordProgress step={2} />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader title="位置を選択" showBack backPath={backPath} />
      <RecordProgress step={2} />

      <main className="flex-1 px-4 py-6">
        <div className="space-y-6 max-w-2xl mx-auto">

          {/* 位置許可が拒否されている場合の警告 (#33) */}
          {geoPermission === "denied" && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">現在地の取得が許可されていません</p>
                <p className="text-amber-700 mt-0.5">ブラウザの設定から位置情報を許可するか、検索で場所を選んでください。</p>
              </div>
            </div>
          )}

          {hasPhotoGps && photoMeta ? (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 text-sm text-primary">
                <MapPin className="h-4 w-4" />
                <span>写真からGPS情報を検出しました。写真タブで候補を確認できます。</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  写真にGPS情報がありません。現在地ボタンまたは検索で場所を選んでください。
                </span>
              </div>
            </div>
          )}

          <SpotPicker
            onSelect={handleSelectCandidate}
            defaultTab={hasPhotoGps ? "photo" : "search"}
            spotId={spotId}
            photoGpsLocations={
              photoMeta?.allPoints ?? (photoMeta ? [{ lat: photoMeta.lat, lng: photoMeta.lng }] : [])
            }
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
