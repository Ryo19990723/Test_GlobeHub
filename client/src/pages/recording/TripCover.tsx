import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImagePlus, X, Images } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TripCover() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showSpotPhotos, setShowSpotPhotos] = useState(false);

  const { data: trip, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch trip");
      return res.json();
    },
    enabled: !!tripId,
  });

  const updateTripMutation = useMutation({
    mutationFn: async (heroUrl: string | null) => {
      return apiRequest("PATCH", `/api/trips/${tripId}`, { heroUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed: ${text.substring(0, 100)}`);
      }

      const data = await res.json();
      setPreviewUrl(data.url);
      await updateTripMutation.mutateAsync(data.url);
    } catch (error) {
      toast({
        title: "アップロードエラー",
        description: "写真のアップロードに失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setPreviewUrl(null);
    await updateTripMutation.mutateAsync(null);
  };

  const handleSelectSpotPhoto = async (photoUrl: string) => {
    setPreviewUrl(photoUrl);
    await updateTripMutation.mutateAsync(photoUrl);
    setShowSpotPhotos(false);
  };

  const handleNext = () => {
    const currentHeroUrl = previewUrl || trip?.heroUrl;
    if (!currentHeroUrl) return;
    navigate(`/record/${tripId}/general`);
  };

  const handleSaveAndExit = () => {
    navigate(`/record/${tripId}`);
  };

  const currentHeroUrl = previewUrl || trip?.heroUrl;

  // スポットの写真を全て収集
  const allSpotPhotos: Array<{ url: string; spotName: string }> = [];
  if (trip?.spots) {
    for (const spot of trip.spots) {
      for (const photo of (spot.photos || [])) {
        allSpotPhotos.push({ url: photo.url, spotName: spot.placeName || spot.name || "スポット" });
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="旅のトップ画像" showBack backPath={`/record/${tripId}`} />

      <div className="p-4 space-y-6">
        <div className="text-center text-muted-foreground">
          旅を象徴する1枚を選択してください
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {currentHeroUrl ? (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <img
              src={currentHeroUrl}
              alt="Trip cover"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
              data-testid="button-remove-cover"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 新しく写真を選ぶ */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-3 hover-elevate"
              data-testid="button-upload-cover"
            >
              {uploading ? (
                <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImagePlus className="w-12 h-12 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">新しく写真を選ぶ</span>
                  <span className="text-xs text-muted-foreground">タップしてライブラリから選択</span>
                </>
              )}
            </button>

            {/* スポット写真から選ぶ */}
            {allSpotPhotos.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSpotPhotos(true)}
                className="w-full py-4 rounded-lg border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-2 hover-elevate bg-primary/5"
                data-testid="button-select-spot-photo"
              >
                <Images className="w-8 h-8 text-primary" />
                <span className="text-primary font-medium">登録済みスポットの写真から選ぶ</span>
                <span className="text-xs text-muted-foreground">{allSpotPhotos.length}枚の写真から選択</span>
              </button>
            )}
          </div>
        )}

        <div className="pt-4 space-y-2">
          <Button
            data-testid="button-next"
            onClick={handleNext}
            disabled={!currentHeroUrl}
            className="w-full h-14 text-lg"
          >
            次へ
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveAndExit}
            className="w-full h-11"
            data-testid="button-save-exit"
          >
            保存して終了
          </Button>
        </div>
      </div>

      {/* スポット写真選択ダイアログ */}
      <Dialog open={showSpotPhotos} onOpenChange={setShowSpotPhotos}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>スポットの写真から選択</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {allSpotPhotos.map((photo, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectSpotPhoto(photo.url)}
                className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                data-testid={`spot-photo-option-${index}`}
              >
                <img
                  src={photo.url}
                  alt={photo.spotName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1.5 py-1 truncate">
                  {photo.spotName}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
