import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, MapPin, Calendar, Users, Shield, Car, Lightbulb, Heart, Image, Star, Wallet, Clock, Trash2, Plus, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

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

export default function TripPreview() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const [deleteSpotId, setDeleteSpotId] = useState<string | null>(null);

  const { data: trip, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch trip");
      return res.json();
    },
    enabled: !!tripId,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/trips/${tripId}`, { status: "PUBLISHED" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      navigate("/record");
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/trips/${tripId}`, { status: "DRAFT" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      navigate("/record");
    },
  });

  const addSpotMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/trips/${tripId}/spots`, { name: "" });
    },
    onSuccess: (newSpot: any) => {
      navigate(`/record/${tripId}/spot/photo?spotId=${newSpot.id}`);
    },
  });

  const deleteSpotMutation = useMutation({
    mutationFn: async (spotId: string) => {
      return apiRequest("DELETE", `/api/spots/${spotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      setDeleteSpotId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), "yyyy年M月d日", { locale: ja });
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <MobileHeader title="確認" showBack backPath={`/record/${tripId}/general`} />
      
      <div className="p-4 space-y-4">
        {trip?.heroUrl && (
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <img
              src={trip.heroUrl}
              alt="Trip cover"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{trip?.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {trip?.city && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{trip.city}{trip.country ? ` (${trip.country})` : ""}</span>
              </div>
            )}
            {(trip?.startDate || trip?.endDate) && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {formatDate(trip.startDate)}
                  {trip.endDate && ` 〜 ${formatDate(trip.endDate)}`}
                </span>
              </div>
            )}
            {trip?.peopleCount && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{trip.peopleCount}人</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              スポット一覧（{trip?.spots?.length || 0}件）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trip?.spots?.map((spot: any, index: number) => (
              <div key={spot.id} className="rounded-xl border bg-muted/30 overflow-hidden">
                {/* 写真 + 名前 行 */}
                <div className="flex gap-3 p-3">
                  {spot.photos?.[0]?.url ? (
                    <img
                      src={spot.photos[0].url}
                      alt={spot.placeName || "Spot"}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="font-medium truncate">
                      {spot.placeName || spot.name || `スポット ${index + 1}`}
                    </div>
                    {/* カテゴリ + おすすめ度 + タグ */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      {spot.category && (
                        <span className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[spot.category] || spot.category}
                        </span>
                      )}
                      {spot.rating > 0 && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${star <= spot.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                            />
                          ))}
                        </div>
                      )}
                      {spot.cost && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Wallet className="h-3 w-3" />
                          {COST_LABELS[spot.cost] || spot.cost}
                        </span>
                      )}
                      {spot.duration && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {DURATION_LABELS[spot.duration] || spot.duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* 感想テキスト（音声入力） */}
                {spot.impressionRemarks && (
                  <div className="px-3 pb-2">
                    <div className="bg-background rounded-lg px-3 py-2 border border-border/40">
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {spot.impressionRemarks}
                      </p>
                    </div>
                  </div>
                )}
                {/* 編集・削除ボタン */}
                <div className="flex items-center gap-2 px-3 pb-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/record/${tripId}/spot/detail?spotId=${spot.id}`)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    編集
                  </button>
                  <span className="text-border">·</span>
                  <button
                    type="button"
                    onClick={() => setDeleteSpotId(spot.id)}
                    className="flex items-center gap-1 text-xs text-destructive/70 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    削除
                  </button>
                </div>
              </div>
            ))}
            {(!trip?.spots || trip.spots.length === 0) && (
              <div className="text-center text-muted-foreground py-4">
                スポットがありません
              </div>
            )}
            {/* スポット追加ボタン */}
            <button
              type="button"
              onClick={() => addSpotMutation.mutate()}
              disabled={addSpotMutation.isPending}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-50"
            >
              {addSpotMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              スポットを追加
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">旅のまとめ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trip?.safetyTips && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="w-4 h-4 text-primary" />
                  安全に旅するためのポイント
                </div>
                <div className="text-sm text-muted-foreground pl-6">
                  {trip.safetyTips}
                </div>
              </div>
            )}
            {trip?.transportTips && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Car className="w-4 h-4 text-primary" />
                  移動手段のポイント
                </div>
                <div className="text-sm text-muted-foreground pl-6">
                  {trip.transportTips}
                </div>
              </div>
            )}
            {trip?.travelTips && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  次の旅人に伝えたいコツ・注意点
                </div>
                <div className="text-sm text-muted-foreground pl-6">
                  {trip.travelTips}
                </div>
              </div>
            )}
            {trip?.memorableMoment && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Heart className="w-4 h-4 text-primary" />
                  心に残った瞬間
                </div>
                <div className="text-sm text-muted-foreground pl-6">
                  {trip.memorableMoment}
                </div>
              </div>
            )}
            {!trip?.safetyTips && !trip?.transportTips && !trip?.travelTips && !trip?.memorableMoment && (
              <div className="text-center text-muted-foreground py-2">
                まとめ情報がありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* スポット削除確認ダイアログ */}
      <Dialog open={!!deleteSpotId} onOpenChange={(open) => { if (!open) setDeleteSpotId(null); }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>スポットを削除しますか？</DialogTitle>
            <DialogDescription>この操作は取り消せません。スポットと写真がすべて削除されます。</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteSpotId(null)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteSpotMutation.isPending}
              onClick={() => deleteSpotId && deleteSpotMutation.mutate(deleteSpotId)}
            >
              {deleteSpotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "削除する"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] p-4 bg-background border-t space-y-2">
        <Button
          data-testid="button-publish"
          onClick={() => publishMutation.mutate()}
          disabled={publishMutation.isPending || saveDraftMutation.isPending}
          className="w-full h-14 text-lg"
        >
          {publishMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              公開中...
            </>
          ) : (
            "公開する"
          )}
        </Button>
        <Button
          data-testid="button-save-draft"
          variant="outline"
          onClick={() => saveDraftMutation.mutate()}
          disabled={publishMutation.isPending || saveDraftMutation.isPending}
          className="w-full h-12"
        >
          {saveDraftMutation.isPending ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            "下書き保存"
          )}
        </Button>
      </div>
    </div>
  );
}
