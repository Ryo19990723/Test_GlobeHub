import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Check, PenLine } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { PlacePicker } from "@/components/recording/PlacePicker";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { momentTime } from "@/lib/quickCapture";

const timeFmt = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Confirm places later (on the train, at the hotel). Optional — journals work without it. */
export default function PlaceReview() {
  const [, params] = useRoute("/record/:tripId/places");
  const [, setLocation] = useLocation();
  const tripId = params?.tripId || "";

  const { data: trip, isLoading } = useQuery<any>({
    queryKey: ["/api/trips", tripId],
    queryFn: () => api.trips.getById(tripId),
    enabled: !!tripId,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });

  const spots = [...(trip?.spots ?? [])].sort((a: any, b: any) => momentTime(a).getTime() - momentTime(b).getTime());
  const pending = spots.filter((s: any) => !s.placeName && !s.name && (s.photos.length || s.impressionRemarks));
  const located = [...spots].reverse().find((s: any) => s.lat != null && s.lng != null);
  const bias = located ? { lat: located.lat, lng: located.lng } : null;

  return (
    <div className="pb-24">
      <MobileHeader title="場所を確認" showBack backPath={`/record/${tripId}`} />
      {isLoading ? (
        <div className="flex justify-center pt-20"><LoadingSpinner /></div>
      ) : pending.length === 0 ? (
        <div className="px-8 pt-20 text-center space-y-4">
          <Check className="h-10 w-10 mx-auto text-[#3C237D]" />
          <p className="font-semibold">すべての場所を確認しました</p>
          <Button onClick={() => setLocation(`/record/${tripId}`)} className="bg-[#3C237D] hover:bg-[#3C237D]/90">旅に戻る</Button>
        </div>
      ) : (
        <>
          <p className="px-4 pt-4 text-sm text-muted-foreground">候補をタップするか、名前で探して選んでください。確認しなくても旅行記はつくれます。</p>
          <ul className="px-4 pt-3 space-y-3">
            {pending.map((s: any) => (
              <li key={s.id} className="rounded-2xl border border-[#EDE9FE] p-3 space-y-3">
                <div className="flex gap-3">
                  {s.photos?.[0] ? (
                    <img src={s.photos[0].url} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-[#3C237D]/5 flex items-center justify-center shrink-0">
                      <PenLine className="h-5 w-5 text-[#3C237D]/50" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{timeFmt.format(momentTime(s))}</p>
                    <p className="text-sm line-clamp-2">{s.impressionRemarks || "（ひとことなし）"}</p>
                  </div>
                </div>
                <PlacePicker spot={s} bias={bias} onChange={refresh} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
