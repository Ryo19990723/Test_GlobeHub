import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, Image as ImageIcon, RefreshCw } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { SpotPicker } from "@/components/recording/SpotPicker";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { saveSpotLocation } from "@/lib/api";

export default function SpotLocation() {
  const [, params] = useRoute("/record/:tripId/spot/loc");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const tripId = params?.tripId || "";
  const spotId = new URLSearchParams(window.location.search).get("spotId") || "";

  const [hasPhotoGps, setHasPhotoGps] = useState<boolean | null>(null);
  const [photoMeta, setPhotoMeta] = useState<{ lat: number; lng: number } | null>(null);
  const [isReady, setIsReady] = useState(false);

  // tripIdチェック
  useEffect(() => {
    if (!tripId) {
      toast({
        title: "エラー",
        description: "旅記録が見つかりません",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [tripId, toast, setLocation]);

  const { data: spot, isLoading: isLoadingSpot } = useQuery({
    queryKey: ["/api/spots", spotId],
    queryFn: async () => {
      const res = await fetch(`/api/spots/${spotId}`);
      if (!res.ok) throw new Error("Failed to fetch spot");
      return res.json();
    },
    enabled: !!spotId,
  });

  // 初期化処理を1回のuseEffectで完結
  useEffect(() => {
    if (!spotId || isLoadingSpot) return;

    // 写真が未アップロードの場合はリダイレクト
    if (spot && (!spot.photos || spot.photos.length === 0)) {
      toast({
        title: "写真を追加してください",
        description: "先に写真を1枚以上追加してください",
      });
      setLocation(`/record/${tripId}/spot/photo?spotId=${spotId}`, { replace: true });
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
        console.error("Failed to parse photoMeta:", e);
        setPhotoMeta(null);
        setHasPhotoGps(false);
      }
    } else {
      setPhotoMeta(null);
      setHasPhotoGps(false);
    }

    // 即座に準備完了
    setIsReady(true);
  }, [spot, spotId, tripId, isLoadingSpot, toast, setLocation]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSelectCandidate = async (candidate: any) => {
    // 連打防止
    if (isSubmitting) {
      return;
    }

    // 必須フィールドの検証
    if (!candidate.lat || !candidate.lng) {
      toast({
        title: "エラー",
        description: "位置情報が不正です",
        variant: "destructive",
      });
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

    // AbortController for request cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Try to save to server with timeout and retry
      await saveSpotLocation(payload, abortControllerRef.current.signal);

      // Success: clear session storage
      sessionStorage.removeItem(`spot_${spotId}_photoMeta`);

      // Update cache asynchronously (don't wait)
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/spots", spotId] });

      toast({
        title: "位置を確定しました",
        description: "スポット内容を入力してください",
      });

      // Navigate to spot detail
      setLocation(`/record/${tripId}/spot/detail?spotId=${spotId}`);
    } catch (error: any) {
      // Fallback: Save as draft and proceed anyway
      const draftKey = `spot_${spotId}_locationDraft`;
      sessionStorage.setItem(draftKey, JSON.stringify({
        ...payload,
        offline: true,
        savedAt: Date.now(),
      }));

      toast({
        title: "下書き保存しました",
        description: "オフラインで保存されました。後で同期されます。",
        variant: "default",
      });

      // Still navigate to next screen
      setLocation(`/record/${tripId}/spot/detail?spotId=${spotId}`);
    } finally {
      // Always release the UI
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="位置を選択" showBack backPath={`/record/${tripId}`} />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </main>
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
                <ImageIcon className="h-4 w-4" />
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
            defaultTab={hasPhotoGps ? "photo" : "current"}
            spotId={spotId}
            {...(photoMeta && { initialLat: photoMeta.lat, initialLng: photoMeta.lng })}
            disablePhotoTab={!hasPhotoGps}
            isSubmitting={isSubmitting}
          />
        </div>
      </main>
    </div>
  );
}