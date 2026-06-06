import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordProgress } from "@/components/recording/RecordProgress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, MapPin, Check, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { id: "sightseeing", label: "観光" },
  { id: "gourmet", label: "グルメ" },
  { id: "nature", label: "自然" },
  { id: "experience", label: "体験" },
  { id: "street", label: "街歩き" },
  { id: "hotel", label: "宿" },
  { id: "transport", label: "移動" },
  { id: "other", label: "その他" },
];

const COST_PRESETS = ["無料", "〜500円", "500〜2000円", "2000円〜"];

const DURATION_TAGS = [
  { id: "10min", label: "10分" },
  { id: "30min", label: "30分" },
  { id: "1hour", label: "1時間" },
  { id: "halfday", label: "半日" },
];

export default function SpotDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const spotId = new URLSearchParams(search).get("spotId");
  const returnTo = new URLSearchParams(search).get("returnTo") || "";
  const { toast } = useToast();
  const exitAfterSaveRef = useRef(false);

  const [category, setCategory] = useState("");
  const [cost, setCost] = useState("");
  const [duration, setDuration] = useState<string | null>(null);
  const [rating, setRating] = useState(0);

  const { data: spot, isLoading: spotLoading } = useQuery({
    queryKey: ["/api/spots", spotId],
    queryFn: async () => {
      const res = await fetch(`/api/spots/${spotId}`);
      if (!res.ok) throw new Error("Failed to fetch spot");
      return res.json();
    },
    enabled: !!spotId,
  });

  useEffect(() => {
    if (spot) {
      setCategory(spot.category || "");
      setCost(spot.cost || "");
      setDuration(spot.duration || null);
      setRating(spot.rating || 0);
    }
  }, [spot]);

  const updateSpotMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/spots/${spotId}`, {
        category,
        cost: cost.trim() || null,
        duration,
        rating,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spots", spotId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      if (exitAfterSaveRef.current) {
        exitAfterSaveRef.current = false;
        navigate(`/record/${tripId}`);
      } else if (returnTo === "preview") {
        navigate(`/record/${tripId}/spot/voice?spotId=${spotId}&returnTo=preview`);
      } else {
        navigate(`/record/${tripId}/spot/voice?spotId=${spotId}`);
      }
    },
    onError: (error: any) => {
      exitAfterSaveRef.current = false;
      toast({ title: "エラー", description: error.message || "保存に失敗しました", variant: "destructive" });
    },
  });

  const handleNext = () => {
    if (!category || rating === 0) return;
    updateSpotMutation.mutate();
  };

  const handleSaveAndExit = () => {
    if (!category || rating === 0) return;
    exitAfterSaveRef.current = true;
    updateSpotMutation.mutate();
  };

  if (spotLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="スポット内容" showBack backPath={`/record/${tripId}`} />
        <RecordProgress step={3} />
        <div className="p-4 space-y-6 pb-24">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-9 rounded" />)}
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        title="スポット内容"
        showBack
        backPath={`/record/${tripId}/spot/loc?spotId=${spotId}${returnTo ? `&returnTo=${returnTo}` : ''}`}
      />
      <RecordProgress step={3} />

      <div className="p-4 space-y-6 pb-24">
        {spot?.placeName && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-medium">{spot.placeName}</span>
          </div>
        )}

        {/* カテゴリ */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            カテゴリ <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                data-testid={`button-category-${cat.id}`}
                onClick={() => setCategory(cat.id)}
                className={`p-2 rounded-lg border text-center transition-all text-sm ${
                  category === cat.id
                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                    : "border-border hover-elevate"
                }`}
              >
                <div className="font-medium">{cat.label}</div>
                {category === cat.id && (
                  <Check className="w-3 h-3 text-primary mx-auto mt-1" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* おすすめ度（カテゴリの直後） */}
        <div className="space-y-2">
          <Label className="text-base font-medium">
            おすすめ度 <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                data-testid={`button-rating-${star}`}
                onClick={() => setRating(rating === star ? 0 : star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* 費用感（テキスト入力 + クイック選択） */}
        <div className="space-y-2">
          <Label className="text-base font-medium">費用感（任意）</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COST_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCost(preset)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  cost === preset
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <Input
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="例：2500円、無料、入場料あり"
            className="h-9 text-sm"
            data-testid="input-cost"
          />
        </div>

        {/* 所要時間 */}
        <div className="space-y-2">
          <Label className="text-base font-medium">所要時間（任意）</Label>
          <div className="flex flex-wrap gap-2">
            {DURATION_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setDuration(duration === tag.id ? null : tag.id)}
                data-testid={`tag-duration-${tag.id}`}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  duration === tag.id
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 space-y-2">
          <Button
            data-testid="button-save-spot"
            disabled={!category || rating === 0 || updateSpotMutation.isPending}
            onClick={handleNext}
            className="w-full h-14 text-lg"
          >
            {updateSpotMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />保存中...</>
            ) : (
              "次へ"
            )}
          </Button>
          <Button
            variant="outline"
            data-testid="button-save-exit-spot"
            disabled={!category || rating === 0 || updateSpotMutation.isPending}
            onClick={handleSaveAndExit}
            className="w-full h-11"
          >
            保存して終了
          </Button>
        </div>
      </div>
    </div>
  );
}
