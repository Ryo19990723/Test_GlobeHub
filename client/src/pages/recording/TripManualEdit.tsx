import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TripManualEdit() {
  const [, params] = useRoute("/record/:tripId/edit");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const tripId = params?.tripId || "";

  const { data: trip, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch trip");
      return res.json();
    },
    enabled: !!tripId,
  });

  const publishTripMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/trips/${tripId}/publish`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "旅記録を公開しました",
        description: "みんなに見てもらいましょう!",
      });
      setLocation(`/trips/${data.id}`);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "旅記録の公開に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handlePublish = () => {
    publishTripMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="旅記録を編集" showBack backPath={`/record/${tripId}`} />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader
        title="旅記録を編集"
        showBack
        backPath={`/record/${tripId}`}
      />

      <main className="flex-1 px-4 py-6">
        <div className="space-y-6 max-w-2xl mx-auto">
          {trip && (
            <div className="text-center pb-4 border-b">
              <h2 className="text-lg font-semibold">{trip.title}</h2>
              {trip.city && (
                <p className="text-sm text-muted-foreground">
                  {[trip.city, trip.country].filter(Boolean).join(", ")}
                </p>
              )}
              {trip._count?.spots > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {trip._count.spots}個のスポットを記録しました
                </p>
              )}
            </div>
          )}

          <div className="space-y-3 pt-4">
            <Button
              size="lg"
              className="w-full gap-2 h-14 text-lg"
              onClick={handlePublish}
              disabled={publishTripMutation.isPending}
              data-testid="button-publish-trip"
            >
              {publishTripMutation.isPending ? (
                <>
                  <LoadingSpinner />
                  公開中...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  旅を公開
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-14"
              onClick={() => setLocation(`/record/${tripId}`)}
              data-testid="button-back-to-trip"
            >
              編集を続ける
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}