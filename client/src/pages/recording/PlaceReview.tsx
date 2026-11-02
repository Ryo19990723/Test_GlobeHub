import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Check, Mic, MapPin } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { momentTime } from "@/lib/quickCapture";

interface Candidate {
  name: string;
  address?: string;
  distanceMeters?: number;
}

const timeFmt = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function PlaceRow({ spot, onDone }: { spot: any; onDone: () => void }) {
  const [manual, setManual] = useState("");
  const [saving, setSaving] = useState(false);
  const hasGps = spot.lat != null && spot.lng != null;

  const { data, isLoading } = useQuery<{ candidates: Candidate[] }>({
    queryKey: ["/api/location/candidates", spot.lat, spot.lng],
    queryFn: async () => {
      const res = await fetch(`/api/location/candidates?method=current&lat=${spot.lat}&lng=${spot.lng}&limit=4`, { credentials: "include" });
      return res.ok ? res.json() : { candidates: [] };
    },
    enabled: hasGps,
    staleTime: Infinity,
  });

  const choose = async (c: Candidate) => {
    setSaving(true);
    await api.spots.update(spot.id, { placeName: c.name.slice(0, 100), name: c.name.slice(0, 80), ...(c.address ? { address: c.address.slice(0, 200) } : {}) });
    onDone();
  };

  return (
    <li className="rounded-2xl border border-[#EDE9FE] p-3 space-y-3">
      <div className="flex gap-3">
        {spot.photos?.[0] ? (
          <img src={spot.photos[0].url} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-[#3C237D]/5 flex items-center justify-center shrink-0">
            <Mic className="h-5 w-5 text-[#3C237D]/50" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{timeFmt.format(momentTime(spot))}</p>
          <p className="text-sm line-clamp-2">{spot.impressionRemarks || "（ひとことなし）"}</p>
        </div>
      </div>

      {hasGps && (
        <div className="space-y-1.5">
          {isLoading && <p className="text-xs text-muted-foreground">近くの場所を探しています…</p>}
          {data?.candidates?.slice(0, 4).map((c) => (
            <button
              key={c.name + c.address}
              disabled={saving}
              onClick={() => choose(c)}
              className="w-full flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-left active:bg-[#3C237D]/10"
            >
              <MapPin className="h-4 w-4 text-[#3C237D] shrink-0" />
              <span className="text-sm flex-1 truncate">{c.name}</span>
              {c.distanceMeters != null && <span className="text-xs text-muted-foreground">{Math.round(c.distanceMeters)}m</span>}
            </button>
          ))}
          {!isLoading && !data?.candidates?.length && <p className="text-xs text-muted-foreground">近くの候補が見つかりませんでした</p>}
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) choose({ name: manual.trim() });
        }}
      >
        <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="自分で入力" className="h-10" />
        <Button type="submit" variant="outline" disabled={saving || !manual.trim()} className="h-10">
          決定
        </Button>
      </form>
    </li>
  );
}

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

  const pending = (trip?.spots ?? [])
    .filter((s: any) => !s.placeName && !s.name && (s.photos.length || s.impressionRemarks))
    .sort((a: any, b: any) => momentTime(a).getTime() - momentTime(b).getTime());

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });

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
          <p className="px-4 pt-4 text-sm text-muted-foreground">候補をタップすると確定します。確認しなくても旅行記はつくれます。</p>
          <ul className="px-4 pt-3 space-y-3">
            {pending.map((s: any) => <PlaceRow key={s.id} spot={s} onDone={refresh} />)}
          </ul>
        </>
      )}
    </div>
  );
}
