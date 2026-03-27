import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, FileText } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DraftTripCard } from "@/components/recording/DraftTripCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Record() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState("");
  const { toast } = useToast();

  const { data: trips, isLoading } = useQuery({
    queryKey: ["/api/trips", "draft"],
    queryFn: () => api.trips.getAll({ status: "draft", sort: "new" }),
  });

  const createTripMutation = useMutation({
    mutationFn: api.trips.create,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setIsDialogOpen(false);
      setNewTripTitle("");
      setLocation(`/record/${data.id}`);
      toast({
        title: "旅記録を作成しました",
        description: "スポットを追加して記録を始めましょう",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "旅記録の作成に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleCreateTrip = () => {
    if (!newTripTitle.trim()) {
      toast({
        title: "タイトルを入力してください",
        variant: "destructive",
      });
      return;
    }
    createTripMutation.mutate({ title: newTripTitle.trim() });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader title="記録する" />

      <main className="flex-1 px-4 py-6">
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="space-y-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full gap-2 text-base rounded-xl shadow-lg" data-testid="button-new-trip">
                  <Plus className="h-5 w-5" />
                  新しい旅を始める
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-new-trip">
                <DialogHeader>
                  <DialogTitle>新しい旅記録</DialogTitle>
                  <DialogDescription>
                    旅のタイトルを入力してください（後で変更できます）
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="trip-title">タイトル</Label>
                    <Input
                      id="trip-title"
                      placeholder="例: 京都の秋、バリ島バケーション"
                      value={newTripTitle}
                      onChange={(e) => setNewTripTitle(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleCreateTrip()}
                      data-testid="input-trip-title"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleCreateTrip}
                    disabled={createTripMutation.isPending || !newTripTitle.trim()}
                    data-testid="button-create-trip"
                  >
                    {createTripMutation.isPending ? "作成中..." : "作成"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4 px-1">作成途中の旅</h2>

            {isLoading ? (
              <LoadingSpinner className="py-12" />
            ) : !trips?.items?.length ? (
              <EmptyState
                icon={FileText}
                title="作成途中の旅がありません"
                description="新しい旅を始めて、素敵な思い出を記録しましょう"
                actionLabel="新しい旅を始める"
                onAction={() => setIsDialogOpen(true)}
              />
            ) : (
              <div className="space-y-4">
                {trips.items.map((trip: any) => (
                  <DraftTripCard
                    key={trip.id}
                    id={trip.id}
                    title={trip.title}
                    spotCount={trip._count?.spots || 0}
                    updatedAt={new Date(trip.updatedAt)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
