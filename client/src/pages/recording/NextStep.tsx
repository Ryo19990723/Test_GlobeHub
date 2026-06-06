import { useRoute, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Plus, Globe, CheckCircle, Eye } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function NextStep() {
  const [, params] = useRoute("/record/:tripId/next-step");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const tripId = params?.tripId || "";
  const spotId = new URLSearchParams(search).get("spotId") || "";

  const { data: trip, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!tripId,
  });

  const justRegisteredSpot = trip?.spots?.find((s: any) => s.id === spotId);
  const spotCount = trip?.spots?.length ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="次のステップ" showBack backPath={`/record/${tripId}`} />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MobileHeader title="次のステップ" showBack backPath={`/record/${tripId}`} />

      <main className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">
        {/* 完了メッセージ */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            {justRegisteredSpot?.name
              ? `「${justRegisteredSpot.name}」を登録しました`
              : "スポットを登録しました"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            現在 {spotCount} 件のスポットが登録されています
          </p>
        </div>

        {/* 選択肢カード */}
        <div className="space-y-3">
          {/* スポットを追加 */}
          <button
            onClick={() => setLocation(`/record/${tripId}/spot/photo`)}
            className="w-full text-left rounded-2xl border-2 border-[#3C237D] bg-[#3C237D]/5 p-5 hover:bg-[#3C237D]/10 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#3C237D] flex items-center justify-center flex-shrink-0">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-1">別のスポットを追加する</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  カフェ、美術館、レストランなど、<br />この旅で訪れた場所をもっと記録する
                </p>
              </div>
            </div>
          </button>

          {/* 都市情報入力 */}
          <button
            onClick={() => setLocation(`/record/${tripId}/general?step=1`)}
            className="w-full text-left rounded-2xl border-2 border-gray-200 bg-white p-5 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Globe className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-1">都市全体の情報を入力する</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  安全情報・移動手段・旅のコツなど、<br />次の旅人に伝えたいことをまとめる
                </p>
              </div>
            </div>
          </button>

          {/* プレビューを見る (#10) */}
          <button
            onClick={() => setLocation(`/record/${tripId}/preview`)}
            className="w-full text-left rounded-2xl border-2 border-gray-200 bg-white p-5 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-1">旅のプレビューを見る</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  記録した内容を確認・仕上げて公開する
                </p>
              </div>
            </div>
          </button>

          {/* 旅記録に戻る */}
          <button
            onClick={() => setLocation(`/record/${tripId}`)}
            className="w-full text-center py-3 text-sm text-muted-foreground hover:text-gray-700 transition-colors"
          >
            <MapPin className="w-4 h-4 inline-block mr-1" />
            旅記録の一覧に戻る
          </button>
        </div>
      </main>
    </div>
  );
}
