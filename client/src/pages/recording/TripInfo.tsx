import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save, Users, Target, UserCircle } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TripInfo() {
  const [, params] = useRoute("/record/:tripId/info");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const tripId = params?.tripId || "";

  const [peopleCount, setPeopleCount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [groupType, setGroupType] = useState("");

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
    mutationFn: async (data: { peopleCount?: number; purpose?: string; groupType?: string }) => {
      return apiRequest("PATCH", `/api/trips/${tripId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      toast({
        title: "旅の情報を保存しました",
        description: "次のステップに進みます",
      });
      // Ensure navigation happens after toast
      setTimeout(() => {
        setLocation(`/record/${tripId}/cover`);
      }, 100);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "旅の情報の保存に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    try {
      await updateTripMutation.mutateAsync({
        peopleCount: peopleCount ? parseInt(peopleCount) : undefined,
        purpose: purpose || undefined,
        groupType: groupType || undefined,
      });
    } catch (error) {
      // Error already handled in onError
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="旅の情報" showBack backPath={`/record/${tripId}`} />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader
        title="旅の情報"
        showBack
        backPath={`/record/${tripId}`}
      />

      <main className="flex-1 px-4 py-6">
        <div className="space-y-8 max-w-2xl mx-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <Label>人数</Label>
            </div>
            <Input
              type="number"
              min="1"
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
              placeholder="例: 2"
              data-testid="input-people-count"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <Label>目的</Label>
            </div>
            <RadioGroup value={purpose} onValueChange={setPurpose}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="leisure" id="purpose-leisure" data-testid="radio-purpose-leisure" />
                <Label htmlFor="purpose-leisure">レジャー</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="business" id="purpose-business" data-testid="radio-purpose-business" />
                <Label htmlFor="purpose-business">ビジネス</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="study" id="purpose-study" data-testid="radio-purpose-study" />
                <Label htmlFor="purpose-study">学習</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="purpose-other" data-testid="radio-purpose-other" />
                <Label htmlFor="purpose-other">その他</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              <Label>グループ</Label>
            </div>
            <RadioGroup value={groupType} onValueChange={setGroupType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="solo" id="group-solo" data-testid="radio-group-solo" />
                <Label htmlFor="group-solo">一人旅</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="friends" id="group-friends" data-testid="radio-group-friends" />
                <Label htmlFor="group-friends">友人</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="family" id="group-family" data-testid="radio-group-family" />
                <Label htmlFor="group-family">家族</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="couple" id="group-couple" data-testid="radio-group-couple" />
                <Label htmlFor="group-couple">カップル</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full gap-2 h-14 text-lg"
              onClick={handleSave}
              data-testid="button-save-trip-info"
            >
              <Save className="h-5 w-5" />
              保存して次へ
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-12"
              onClick={() => setLocation(`/record/${tripId}/cover`)}
              data-testid="button-skip-trip-info"
            >
              スキップ
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
