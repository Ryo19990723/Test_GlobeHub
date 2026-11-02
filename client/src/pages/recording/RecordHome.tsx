import { useLocation } from "wouter";
import { Camera, BookOpen, ChevronRight, Globe, Lock, MapPin, Sparkles } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useMyTrips, tripThumb, type MyTrip } from "@/hooks/useMyTrips";

function TripRow({ trip, onClick, meta }: { trip: MyTrip; onClick: () => void; meta: React.ReactNode }) {
  const img = tripThumb(trip);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl border border-[#EDE9FE] bg-white p-3 text-left active:bg-gray-50"
      data-testid={`card-trip-${trip.id}`}
    >
      {img ? (
        <img src={img} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="h-16 w-16 rounded-xl bg-[#3C237D]/5 flex items-center justify-center shrink-0">
          <MapPin className="h-6 w-6 text-[#3C237D]/40" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold line-clamp-1">{trip.title}</p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">{meta}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}

/** Guests: what GlobeHub does, and one button to start (sign-up lands on /record/new). */
function GuestIntro() {
  const [, setLocation] = useLocation();
  return (
    <div className="px-6 pt-12 pb-24 text-center space-y-6">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-[#3C237D]/10 flex items-center justify-center">
        <Camera className="h-8 w-8 text-[#3C237D]" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-bold">撮って、ひとこと話すだけ。</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          旅先で写真を撮って、ひとこと残すだけ。
          <br />
          旅が終わると、AIが旅行記にまとめます。
        </p>
      </div>
      <div className="space-y-3">
        <Button onClick={() => setLocation("/mypage/register")} className="w-full h-12 bg-[#3C237D] hover:bg-[#3C237D]/90 rounded-xl text-base" data-testid="button-guest-register">
          無料で始める
        </Button>
        <Button variant="ghost" onClick={() => setLocation("/mypage/login?redirect=/record")} className="w-full text-[#3C237D]" data-testid="button-guest-login">
          アカウントをお持ちの方はログイン
        </Button>
      </div>
    </div>
  );
}

export default function RecordHome() {
  const [, setLocation] = useLocation();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { active, done, isLoading } = useMyTrips();

  if (authLoading || (isLoggedIn && isLoading)) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="旅を記録" />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen">
        <MobileHeader title="旅を記録" />
        <GuestIntro />
      </div>
    );
  }

  const ago = (t: MyTrip) => formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true, locale: ja });

  return (
    <div className="min-h-screen">
      <MobileHeader title="旅を記録" />

      <main className="px-4 pt-5 pb-24 space-y-7">
        <button
          onClick={() => setLocation("/record/new")}
          className="w-full rounded-2xl bg-[#3C237D] text-white p-5 flex items-center gap-4 text-left shadow-lg active:scale-[0.99]"
          data-testid="button-new-trip"
        >
          <div className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <Camera className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold">新しい旅を始める</p>
            <p className="text-xs text-white/75 mt-0.5">撮って話すだけで、AIが旅行記に</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/70" />
        </button>

        {active.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[#1E1B4B]">記録中の旅</h2>
            {active.map((t) => (
              <TripRow
                key={t.id}
                trip={t}
                onClick={() => setLocation(`/record/${t.id}`)}
                meta={<>{t._count?.spots ?? 0}件の記録・{ago(t)}</>}
              />
            ))}
          </section>
        )}

        {done.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[#1E1B4B] flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" /> 旅行記
            </h2>
            {done.map((t) => (
              <TripRow
                key={t.id}
                trip={t}
                onClick={() => setLocation(`/record/${t.id}/journal`)}
                meta={
                  t.status === "PUBLISHED" ? (
                    <><Globe className="h-3 w-3" /> 公開中</>
                  ) : (
                    <><Lock className="h-3 w-3" /> 自分だけ</>
                  )
                }
              />
            ))}
          </section>
        )}

        {active.length === 0 && done.length === 0 && (
          <p className="text-sm text-muted-foreground text-center leading-relaxed pt-4">
            旅先で「撮る」を押すだけで記録できます。
            <br />
            旅が終わったら、AIが旅行記にまとめます。
          </p>
        )}

        <button
          onClick={() => setLocation("/record/from-plan")}
          className="w-full flex items-center gap-2 text-sm text-[#3C237D] py-2"
          data-testid="button-from-plan"
        >
          <Sparkles className="h-4 w-4" /> 旅行計画から記録する
          <ChevronRight className="h-4 w-4 ml-auto" />
        </button>
      </main>
    </div>
  );
}
