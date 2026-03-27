import { useState, useEffect } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

const TAGS = {
  cost: [
    { id: "free", label: "無料" },
    { id: "cheap", label: "安い" },
    { id: "normal", label: "普通" },
    { id: "expensive", label: "高め" },
  ],
  duration: [
    { id: "10min", label: "10分" },
    { id: "30min", label: "30分" },
    { id: "1hour", label: "1時間" },
    { id: "halfday", label: "半日" },
  ],
};

export default function SpotDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const spotId = new URLSearchParams(search).get("spotId");
  const { toast } = useToast();

  const [category, setCategory] = useState("");
  const [cost, setCost] = useState<string | null>(null);
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
      setCost(spot.cost || null);
      setDuration(spot.duration || null);
      setRating(spot.rating || 0);
    }
  }, [spot]);

  const updateSpotMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/spots/${spotId}`, {
        category,
        cost,
        duration,
        rating,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spots", spotId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      navigate(`/record/${tripId}/spot/voice?spotId=${spotId}`);
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "保存に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (!category || rating === 0) return;
    updateSpotMutation.mutate();
  };

  if (spotLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        title="スポット内容"
        showBack
        backPath={`/record/${tripId}/spot/loc?spotId=${spotId}`}
      />

      <div className="p-4 space-y-6 pb-24">
        {spot?.placeName && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-medium">{spot.placeName}</span>
          </div>
        )}

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

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">費用感（任意）</Label>
            <div className="flex flex-wrap gap-2">
              {TAGS.cost.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={cost === tag.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setCost(cost === tag.id ? null : tag.id)}
                  data-testid={`tag-cost-${tag.id}`}
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">所要時間（任意）</Label>
            <div className="flex flex-wrap gap-2">
              {TAGS.duration.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={duration === tag.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setDuration(duration === tag.id ? null : tag.id)}
                  data-testid={`tag-duration-${tag.id}`}
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          </div>

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
                    className={`w-6 h-6 ${
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button
            data-testid="button-save-spot"
            disabled={!category || rating === 0 || updateSpotMutation.isPending}
            onClick={handleNext}
            className="w-full h-14 text-lg"
          >
            {updateSpotMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              "次へ"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
