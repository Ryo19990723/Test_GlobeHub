import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, FileText, Clock, MapPin, ChevronRight } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

// Helper to determine the last editing step and its label
function getLastEditingStep(trip: any): string {
  if (!trip.spots || trip.spots.length === 0) {
    return "タイトル入力中";
  }

  const lastSpot = trip.spots[trip.spots.length - 1];
  
  if (!lastSpot.lat || !lastSpot.lng) {
    return "スポット位置選択中";
  }

  if (!lastSpot.category) {
    return "スポット詳細入力中";
  }

  if (!trip.heroUrl) {
    return "カバー画像設定中";
  }

  if (!trip.safetyTips && !trip.transportTips && !trip.travelTips && !trip.memorableMoment) {
    return "旅の情報入力中";
  }

  return "プレビュー確認中";
}

export default function RecordHome() {
  const [, setLocation] = useLocation();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      setLocation("/mypage/login?redirect=/record");
    }
  }, [authLoading, isLoggedIn, setLocation]);

  const { data: drafts, isLoading } = useQuery({
    queryKey: ["/api/trips", { status: "DRAFT" }],
    queryFn: async () => {
      const res = await fetch("/api/trips?status=DRAFT");
      if (!res.ok) throw new Error("Failed to fetch drafts");
      return res.json();
    },
  });

  const handleNewTrip = () => {
    setLocation("/record/new");
  };

  const handleOpenDraft = (tripId: string) => {
    setLocation(`/record/${tripId}`);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="旅を記録" />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  const draftTrips = drafts?.items || [];

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader title="旅を記録" />

      <main className="flex-1 px-4 py-6 pb-24">
        <div className="space-y-6 max-w-2xl mx-auto">
          <Card
            className="hover-elevate active-elevate-2 cursor-pointer"
            onClick={handleNewTrip}
            data-testid="button-new-trip"
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <span className="text-lg font-medium">旅を記録する</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          {draftTrips.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">下書き</h2>
                <Badge variant="secondary">{draftTrips.length}</Badge>
              </div>

              <div className="space-y-3">
                {draftTrips.map((trip: any) => {
                  const lastStep = getLastEditingStep(trip);
                  const displayCity = trip.city || "未定";
                  
                  return (
                    <Card
                      key={trip.id}
                      className="hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => handleOpenDraft(trip.id)}
                      data-testid={`card-draft-${trip.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-muted-foreground mb-1">
                              {displayCity}
                            </div>
                            <div className="text-base font-semibold line-clamp-2">
                              {trip.title}
                            </div>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">
                            下書き
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          前回：{lastStep}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(trip.updatedAt), {
                                addSuffix: true,
                                locale: ja,
                              })}
                            </span>
                          </div>
                          {trip._count?.spots > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {trip._count.spots}スポット
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {draftTrips.length === 0 && (
            <EmptyState
              icon={FileText}
              title="下書きはありません"
              description="新しい旅を始めて、思い出を記録しましょう"
            />
          )}
        </div>
      </main>
    </div>
  );
}
