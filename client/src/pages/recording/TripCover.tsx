import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImagePlus, X } from "lucide-react";

export default function TripCover() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

      console.log("[UPLOAD] Starting upload to /api/photos/upload");
      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type");
      console.log("[UPLOAD] Response - URL: /api/photos/upload");
      console.log("[UPLOAD] Response - Status:", res.status);
      console.log("[UPLOAD] Response - Content-Type:", contentType);

      const responseText = await res.text();
      console.log("[UPLOAD] Response - First 200 chars:", responseText.substring(0, 200));

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}: ${responseText.substring(0, 200)}`);
      }
      
      const data = JSON.parse(responseText);
      console.log("[UPLOAD] Parsed JSON:", data);
      
      setPreviewUrl(data.url);
      await updateTripMutation.mutateAsync(data.url);
    } catch (error) {
      console.error("[UPLOAD] Error:", error);
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

  const handleNext = () => {
    const currentHeroUrl = previewUrl || trip?.heroUrl;
    if (!currentHeroUrl) {
      return;
    }
    navigate(`/record/${tripId}/general`);
  };

  const currentHeroUrl = previewUrl || trip?.heroUrl;

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
          旅を象徴する1枚をアップロード
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
                <span className="text-muted-foreground">タップして写真を選択</span>
              </>
            )}
          </button>
        )}

        <div className="pt-4">
          <Button
            data-testid="button-next"
            onClick={handleNext}
            disabled={!currentHeroUrl}
            className="w-full h-14 text-lg"
          >
            次へ
          </Button>
        </div>
      </div>
    </div>
  );
}
