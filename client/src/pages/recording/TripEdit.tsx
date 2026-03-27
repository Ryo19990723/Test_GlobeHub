import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Plus, Send, Edit2, Check, X, Mic, CheckCircle2 } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpotCard } from "@/components/recording/SpotCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TripEdit() {
  const [, params] = useRoute("/record/:id");
  const [, setLocation] = useLocation();
  const tripId = params?.id || "";
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [deleteSpotId, setDeleteSpotId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId],
    queryFn: () => api.trips.getById(tripId),
    enabled: !!tripId,
  });

  useEffect(() => {
    if (trip?.title) {
      setTitle(trip.title);
    }
  }, [trip?.title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  const updateTripMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.trips.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      setIsEditingTitle(false);
    },
  });

  const publishTripMutation = useMutation({
    mutationFn: api.trips.publish,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "旅記録を公開しました",
        description: "他のユーザーがあなたの旅を見ることができます",
      });
      setLocation("/browse");
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "旅記録の公開に失敗しました",
        variant: "destructive",
      });
    },
  });

  const deleteSpotMutation = useMutation({
    mutationFn: api.spots.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      toast({
        title: "スポットを削除しました",
      });
      setDeleteSpotId(null);
    },
  });

  const createDraftSpotMutation = useMutation({
    mutationFn: async () => {
      return api.spots.create(tripId, {});
    },
    onSuccess: (spot: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      toast({
        title: "新しいスポットを作成しました",
        description: "まず写真を追加しましょう",
      });
      setLocation(`/record/${tripId}/spot/photo?spotId=${spot.id}`);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "スポットの作成に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleSaveTitle = () => {
    if (!title.trim()) {
      toast({
        title: "タイトルを入力してください",
        variant: "destructive",
      });
      return;
    }
    if (title !== trip?.title) {
      updateTripMutation.mutate({ id: tripId, data: { title } });
    } else {
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setTitle(trip?.title || "");
    setIsEditingTitle(false);
  };

  const handlePublish = () => {
    if (!trip?.spots?.length) {
      toast({
        title: "スポットを追加してください",
        description: "最低1つのスポットが必要です",
        variant: "destructive",
      });
      return;
    }
    publishTripMutation.mutate(tripId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="旅を編集" showBack backPath="/record" />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="旅を編集" showBack backPath="/record" />
        <main className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={X}
            title="旅記録が見つかりません"
            description="この旅記録は存在しないか、削除されています"
            actionLabel="記録画面に戻る"
            onAction={() => setLocation("/record")}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader 
        title={trip.title}
        showBack 
        backPath="/record"
      />

      <main className="flex-1 px-4 py-6">
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="grid grid-cols-1 gap-3">
            <Button
              size="lg"
              variant="default"
              className="w-full gap-2 rounded-xl"
              onClick={() => createDraftSpotMutation.mutate()}
              disabled={createDraftSpotMutation.isPending}
              data-testid="button-add-spot"
            >
              スポットを追加
            </Button>
          </div>

          <div>
            <div className="flex-1">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={titleInputRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSaveTitle()}
                    className="text-xl font-bold"
                    data-testid="input-edit-title"
                  />
                  <Button
                    size="icon"
                    onClick={handleSaveTitle}
                    disabled={updateTripMutation.isPending}
                    data-testid="button-save-title"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    data-testid="button-cancel-edit-title"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h2 className="text-xl font-bold">
                    {trip.title}
                  </h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsEditingTitle(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid="button-edit-title"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">
              スポット ({trip.spots?.length || 0})
            </h2>

            {!trip.spots?.length ? (
              <EmptyState
                icon={Mic}
                title="スポットがありません"
                description="音声でスポットを追加して、旅の記録を始めましょう"
                onAction={() => setLocation(`/record/${tripId}/spot/loc`)}
              />
            ) : (
              <div className="space-y-4">
                {trip.spots.map((spot: any) => (
                  <SpotCard
                    key={spot.id}
                    spot={spot}
                    onEdit={(id) => setLocation(`/record/${tripId}/spot/loc?spotId=${id}`)}
                    onDelete={(id) => setDeleteSpotId(id)}
                  />
                ))}
              </div>
            )}
          </div>

          {trip.spots && trip.spots.length > 0 && (
            <div className="pt-6">
              <Button
                size="lg"
                className="w-full gap-2 h-14 text-lg"
                onClick={() => setLocation(`/record/${tripId}/cover`)}
                data-testid="button-complete-trip"
              >
                <CheckCircle2 className="h-5 w-5" />
                都市情報の入力に進む
              </Button>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!deleteSpotId} onOpenChange={() => setDeleteSpotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>スポットを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。スポットに紐付く写真も削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSpotId && deleteSpotMutation.mutate(deleteSpotId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}