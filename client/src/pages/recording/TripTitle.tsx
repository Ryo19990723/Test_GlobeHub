import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export default function TripTitle() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null); // State for error messages

  const createTripMutation = useMutation({
    mutationFn: async (data: { title: string }) => {
      return api.trips.create(data);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "旅記録の作成に失敗しました",
        variant: "destructive",
      });
    },
  });

  const createSpotMutation = useMutation({
    mutationFn: async (tripId: string) => {
      return api.spots.create(tripId, {});
    },
    onSuccess: (spot: any, variables: string) => { // variables is tripId
      queryClient.invalidateQueries({ queryKey: ["/api/trips", variables] });
      setLocation(`/record/${variables}/spot/photo?spotId=${spot.id}`);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "スポットの作成に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setErr("タイトルを入力してください");
      toast({
        title: "タイトルを入力してください",
        variant: "destructive",
      });
      return;
    }

    if (t.length > 80) {
      setErr("タイトルは80文字以内で入力してください");
      toast({
        title: "タイトルは80文字以内で入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      setErr(null);
      // ① Trip作成
      const createdTrip = await createTripMutation.mutateAsync({ title: t });
      // ② 空Spot作成
      await createSpotMutation.mutateAsync(createdTrip.id);
      // ③ 写真アップロード画面へ（createSpotMutationのonSuccessで処理）
    } catch (e: any) {
      setErr(e.message ?? "作成に失敗しました");
      toast({
        title: "エラー",
        description: e.message ?? "旅記録の作成またはスポットの作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader
        title="旅のタイトル"
        showBack
        backPath="/record"
      />

      <main className="flex-1 px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
          <div className="space-y-2">
            <Label htmlFor="trip-title">タイトル</Label>
            <Input
              id="trip-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (err) setErr(null); // Clear error when user types
              }}
              placeholder="例: 京都の紅葉巡り"
              maxLength={80}
              autoFocus
              data-testid="input-trip-title"
            />
            <p className="text-sm text-muted-foreground">
              {title.length} / 80文字
            </p>
            {err && <p className="text-sm text-destructive">{err}</p>}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">旅のタイトルのヒント</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• 訪問した場所や期間を入れると分かりやすくなります</li>
              <li>• 旅の目的やテーマを含めるのもおすすめです</li>
              <li>• 後から編集することもできます</li>
            </ul>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full gap-2 h-14 text-lg"
            disabled={!title.trim() || createTripMutation.isPending || createSpotMutation.isPending}
            data-testid="button-create-trip"
          >
            {createTripMutation.isPending || createSpotMutation.isPending ? (
              <>
                <LoadingSpinner />
                作成中...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                作成して次へ
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}