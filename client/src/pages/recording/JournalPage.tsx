import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Sparkles, Pencil, Share2, Globe, Lock, RefreshCw, Mic, Square } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { JournalView, parseJournal, type Journal } from "@/components/journal/JournalView";
import { api } from "@/lib/api";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/track";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { cn } from "@/lib/utils";

/** Generate, edit, publish and share the AI journal of a trip. */
export default function JournalPage() {
  const [, params] = useRoute("/record/:tripId/journal");
  const tripId = params?.tripId || "";
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<(Journal & { tripTitle: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: trip, isLoading } = useQuery<any>({
    queryKey: ["/api/trips", tripId],
    queryFn: () => api.trips.getById(tripId),
    enabled: !!tripId,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });

  const journal = parseJournal(trip?.journalText);
  const recordCount = (trip?.spots ?? []).filter((s: any) => s.photos?.length || s.impressionRemarks || s.placeName || s.name).length;
  const shareUrl = `${window.location.origin}/trips/${tripId}`;

  // 「旅全体をひとことで」: optional, typed or spoken right before generating.
  const voice = useVoiceRecorder();
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    if (trip) voice.setTranscriptValue(trip.overview ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id, composing]);
  const overviewText = voice.transcript + (voice.isRecording ? voice.interimText : "");

  const generate = async () => {
    if (voice.isRecording) voice.stopRecording();
    setGenerating(true);
    try {
      await apiRequest("POST", `/api/ai/trips/${tripId}/journal`, {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        overview: voice.transcript.trim(),
      });
      await refresh();
      setDraft(null);
      setComposing(false);
    } catch (e: any) {
      toast({ title: "旅行記をつくれませんでした", description: e?.message?.includes("NO_RECORDS") ? "写真かひとことを記録してください" : "しばらくしてからもう一度お試しください", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const saveEdit = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const { tripTitle, ...j } = draft;
      await api.trips.update(tripId, { journalText: JSON.stringify(j), ...(tripTitle.trim() ? { title: tripTitle.trim() } : {}) });
      await refresh();
      setDraft(null);
    } catch {
      toast({ title: "保存できませんでした", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const setPublic = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) {
        await api.trips.publish(tripId); // sets status + publishedAt
        await api.trips.update(tripId, { isPublic: true });
      } else {
        await api.trips.update(tripId, { isPublic: false, status: "DRAFT" });
      }
      await refresh();
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    } catch {
      toast({ title: "公開設定を変更できませんでした", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    try {
      track("share", { tripId, via: "share" in navigator ? "sheet" : "copy" });
      if (navigator.share) {
        await navigator.share({ title: trip.title, text: `旅行記「${trip.title}」`, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "リンクをコピーしました" });
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  if (isLoading || !trip) {
    return <div className="flex justify-center pt-24"><LoadingSpinner /></div>;
  }

  if (generating || !journal || composing) {
    return (
      <div className="pb-24">
        <MobileHeader title="旅行記" showBack {...(composing ? {} : { backPath: `/record/${tripId}` })} />
        <div className="px-6 pt-12 text-center space-y-5">
          <div className="h-16 w-16 mx-auto rounded-full bg-[#3C237D]/10 flex items-center justify-center">
            <Sparkles className={generating ? "h-8 w-8 text-[#3C237D] animate-pulse" : "h-8 w-8 text-[#3C237D]"} />
          </div>
          {generating ? (
            <>
              <p className="font-bold text-lg">旅行記を書いています…</p>
              <p className="text-sm text-muted-foreground">10秒ほどかかります</p>
            </>
          ) : (
            <>
              <p className="font-bold text-lg">{recordCount}件の記録から旅行記をつくります</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                写真・場所・話したひとことをもとに、AIが日記のようにまとめます。
                <br />
                話していないことは書きません。あとで自由に直せます。
              </p>
              <section className="text-left space-y-1.5 pt-2">
                <p className="text-sm font-semibold">旅全体をひとことで <span className="text-xs font-normal text-muted-foreground">（任意・話してもOK）</span></p>
                <div className="flex gap-2 items-start">
                  <Textarea
                    value={overviewText}
                    onChange={(e) => voice.setTranscriptValue(e.target.value)}
                    readOnly={voice.isRecording}
                    maxLength={2000}
                    placeholder="例：2泊3日、友達と。バスより歩きが早い。予算は3万くらい"
                    className="min-h-[88px] text-base flex-1"
                    data-testid="input-overview"
                  />
                  {voice.isSupported && (
                    <button
                      type="button"
                      onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
                      className={cn(
                        "h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-white shadow active:scale-95",
                        voice.isRecording ? "bg-red-500 animate-pulse" : "bg-[#3C237D]",
                      )}
                      aria-label={voice.isRecording ? "録音を止める" : "話して入力"}
                    >
                      {voice.isRecording ? <Square className="h-5 w-5" fill="currentColor" /> : <Mic className="h-5 w-5" />}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">誰と・日数・予算・旅のコツ・感想などを書くと、旅行記の最後に「旅のメモ」としてまとめます</p>
              </section>
              <Button onClick={generate} disabled={recordCount === 0} className="w-full h-14 text-base bg-[#3C237D] hover:bg-[#3C237D]/90 rounded-2xl" data-testid="button-generate-journal">
                <Sparkles className="h-5 w-5 mr-2" /> {journal ? "旅行記を作り直す" : "旅行記をつくる"}
              </Button>
              {composing && (
                <>
                  <p className="text-xs text-muted-foreground">作り直すと、手直しした文章は上書きされます</p>
                  <Button variant="ghost" onClick={() => setComposing(false)} className="w-full">やめる</Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <MobileHeader
        title="旅行記"
        showBack
        backPath={`/record/${tripId}`}
        {...(draft ? {} : { action: { icon: Pencil, label: "編集", onClick: () => setDraft({ ...journal, tripTitle: trip.title }), testId: "button-edit-journal" } })}
      />

      <JournalView trip={trip} journal={draft ?? journal} onEdit={draft ? setDraft : undefined} editingTitle={draft?.tripTitle} />

      {draft ? (
        <div className="px-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setDraft(null)} disabled={busy}>やめる</Button>
          <Button className="flex-1 bg-[#3C237D] hover:bg-[#3C237D]/90" onClick={saveEdit} disabled={busy} data-testid="button-save-journal">
            {busy ? "保存中…" : "保存"}
          </Button>
        </div>
      ) : (
        <div className="px-5 space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-[#EDE9FE] p-4">
            {trip.isPublic ? <Globe className="h-5 w-5 text-[#3C237D]" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
            <div className="flex-1">
              <p className="font-semibold text-sm">{trip.isPublic ? "公開中" : "自分だけ"}</p>
              <p className="text-xs text-muted-foreground">{trip.isPublic ? "記録した場所も含めて、リンクを知っている人とGlobeHubの閲覧ページに表示されます" : "あなたしか見られません"}</p>
            </div>
            <Switch checked={!!trip.isPublic} disabled={busy} onCheckedChange={setPublic} data-testid="switch-public" />
          </div>

          {trip.isPublic && (
            <Button onClick={share} className="w-full h-12 bg-[#3C237D] hover:bg-[#3C237D]/90 rounded-2xl" data-testid="button-share">
              <Share2 className="h-5 w-5 mr-2" /> 共有する
            </Button>
          )}

          <button onClick={() => setComposing(true)} className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground py-2" data-testid="button-regenerate">
            <RefreshCw className="h-4 w-4" /> 旅のメモを足す・記録を追加して作り直す
          </button>
        </div>
      )}
    </div>
  );
}
