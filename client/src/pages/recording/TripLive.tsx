import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Camera, Mic, MapPin, Sparkles, SlidersHorizontal, Globe, Lock } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { WordsSheet } from "@/components/recording/WordsSheet";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { captureFromPhoto, captureVoiceOnly, momentTime } from "@/lib/quickCapture";

interface Spot {
  id: string;
  name: string | null;
  placeName: string | null;
  impressionRemarks: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  capturedAt: string | null;
  createdAt: string;
  photos: { id: string; url: string }[];
}

type Sheet = { spotId: string; autoStart?: boolean; isNew?: boolean } | null;

const timeFmt = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });

/** The trip's home while traveling: 📷 / 🎙 capture and a timeline of moments. */
export default function TripLive() {
  const [, params] = useRoute("/record/:tripId");
  const [, setLocation] = useLocation();
  const tripId = params?.tripId || "";
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [saving, setSaving] = useState(false);

  const { data: trip, isLoading } = useQuery<any>({
    queryKey: ["/api/trips", tripId],
    queryFn: () => api.trips.getById(tripId),
    enabled: !!tripId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });

  const spots: Spot[] = [...(trip?.spots ?? [])]
    .filter((s: Spot) => s.photos.length || s.impressionRemarks || s.notes || s.placeName || s.name)
    .sort((a: Spot, b: Spot) => momentTime(a).getTime() - momentTime(b).getTime());
  const unplaced = spots.filter((s) => !s.placeName && !s.name).length;
  const sheetSpot = sheet ? (trip?.spots ?? []).find((s: Spot) => s.id === sheet.spotId) : null;

  const onPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setBusy(list.length > 1 ? `写真を保存中… (0/${list.length})` : "写真を保存中…");
    try {
      let last: { id: string } | null = null;
      for (let i = 0; i < list.length; i++) {
        last = await captureFromPhoto(tripId, list[i]);
        if (list.length > 1) setBusy(`写真を保存中… (${i + 1}/${list.length})`);
      }
      await refresh();
      // One photo: ask for words right away. Several (picked later from the library): just add them.
      if (list.length === 1 && last) setSheet({ spotId: last.id, isNew: true });
    } catch {
      toast({ title: "写真を保存できませんでした", description: "通信状況を確認してもう一度お試しください", variant: "destructive" });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onVoiceOnly = async () => {
    setBusy("準備中…");
    try {
      const spot = await captureVoiceOnly(tripId);
      setSheet({ spotId: spot.id, autoStart: true, isNew: true });
    } catch {
      toast({ title: "記録を始められませんでした", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const saveWords = async (text: string) => {
    if (!sheet) return;
    setSaving(true);
    try {
      if (text) await api.spots.update(sheet.spotId, { impressionRemarks: text });
      else if (sheet.isNew && !sheetSpot?.photos?.length) await api.spots.delete(sheet.spotId); // empty 🎙 record
      await refresh();
      setSheet(null);
    } catch {
      toast({ title: "保存できませんでした", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const closeSheet = async () => {
    // A 🎙 record closed without words has nothing in it.
    if (sheet?.isNew && !sheetSpot?.photos?.length && !sheetSpot?.impressionRemarks) {
      await api.spots.delete(sheet.spotId).catch(() => {});
      await refresh();
    }
    setSheet(null);
  };

  const deleteRecord = async () => {
    if (!sheet) return;
    await api.spots.delete(sheet.spotId).catch(() => {});
    await refresh();
    setSheet(null);
  };

  if (isLoading || !trip) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  let lastDay = "";

  return (
    <div className="pb-48">
      <MobileHeader
        title={trip.title}
        showBack
        backPath="/record"
        action={{ icon: SlidersHorizontal, label: "詳しく編集", onClick: () => setLocation(`/record/${tripId}/edit`), testId: "button-edit-trip" }}
      />

      <div className="px-4 pt-3 flex items-center gap-2 text-xs text-muted-foreground">
        {trip.isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        <span>{trip.isPublic ? "旅行記を作ったら公開" : "自分だけ"}</span>
        <span>・</span>
        <span>{spots.length}件の記録</span>
      </div>

      {unplaced > 0 && (
        <button
          onClick={() => setLocation(`/record/${tripId}/places`)}
          className="mx-4 mt-3 w-[calc(100%-2rem)] flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left"
          data-testid="button-review-places"
        >
          <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm flex-1">場所が未確認の記録が {unplaced}件 あります</span>
          <span className="text-sm font-semibold text-amber-700">確認する</span>
        </button>
      )}

      {spots.length === 0 ? (
        <div className="px-8 pt-20 text-center space-y-3">
          <p className="text-lg font-bold">旅が始まりました</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            気になった場所で 📷 を押して撮るだけ。
            <br />
            ひとこと話しておくと、あとでAIが旅行記にまとめます。
          </p>
        </div>
      ) : (
        <ol className="px-4 pt-4 space-y-3">
          {spots.map((s) => {
            const t = momentTime(s);
            const day = dayFmt.format(t);
            const showDay = day !== lastDay;
            lastDay = day;
            const place = s.placeName || s.name;
            return (
              <li key={s.id}>
                {showDay && <p className="text-xs font-semibold text-[#3C237D] pt-2 pb-1">{day}</p>}
                <button
                  onClick={() => setSheet({ spotId: s.id })}
                  className="w-full flex gap-3 rounded-2xl border border-[#EDE9FE] bg-white p-3 text-left active:bg-gray-50"
                  data-testid={`record-${s.id}`}
                >
                  {s.photos[0] ? (
                    <img src={s.photos[0].url} alt="" className="h-20 w-20 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-[#3C237D]/5 flex items-center justify-center shrink-0">
                      <Mic className="h-6 w-6 text-[#3C237D]/50" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {timeFmt.format(t)}
                      {place ? <span className="ml-2 text-foreground font-medium">{place}</span> : <span className="ml-2 text-amber-600">場所未確認</span>}
                    </p>
                    <p className={s.impressionRemarks ? "text-sm mt-1 line-clamp-3" : "text-sm mt-1 text-muted-foreground"}>
                      {s.impressionRemarks || s.notes || "＋ ひとことを追加"}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {/* Capture bar, above the bottom navigation */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 pb-3 pt-3 bg-white/95 backdrop-blur border-t border-[#EDE9FE] z-40">
        {spots.length > 0 && (
          <Button
            variant="outline"
            className="w-full mb-3 bg-white border-[#3C237D]/30 text-[#3C237D]"
            onClick={() => setLocation(`/record/${tripId}/journal`)}
            data-testid="button-open-journal"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {trip.journalText ? "旅行記を見る" : "旅行記をつくる"}
          </Button>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!!busy}
            className="flex-1 h-16 rounded-2xl bg-[#3C237D] text-white flex items-center justify-center gap-2 text-base font-semibold shadow-lg active:scale-[0.98] disabled:opacity-60"
            data-testid="button-capture-photo"
          >
            <Camera className="h-6 w-6" /> 撮る
          </button>
          <button
            onClick={onVoiceOnly}
            disabled={!!busy}
            className="flex-1 h-16 rounded-2xl bg-white border-2 border-[#3C237D] text-[#3C237D] flex items-center justify-center gap-2 text-base font-semibold active:scale-[0.98] disabled:opacity-60"
            data-testid="button-capture-voice"
          >
            <Mic className="h-6 w-6" /> 話すだけ
          </button>
        </div>
        {busy && <p className="text-center text-xs text-muted-foreground mt-2">{busy}</p>}
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPhotos(e.target.files)} />
      </div>

      <WordsSheet
        open={!!sheet}
        initialText={sheetSpot?.impressionRemarks ?? ""}
        photoUrl={sheetSpot?.photos?.[0]?.url}
        autoStart={sheet?.autoStart}
        saving={saving}
        onSave={saveWords}
        onClose={closeSheet}
        onDelete={sheet && !sheet.isNew ? deleteRecord : undefined}
      />
    </div>
  );
}
