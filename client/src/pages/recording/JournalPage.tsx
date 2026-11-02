import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Sparkles, Pencil, Share2, Globe, Lock, RefreshCw } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { JournalView, parseJournal, type Journal } from "@/components/journal/JournalView";
import { api } from "@/lib/api";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

  const generate = async () => {
    setGenerating(true);
    try {
      await apiRequest("POST", `/api/ai/trips/${tripId}/journal`, {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      await refresh();
      setDraft(null);
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

  if (generating || !journal) {
    return (
      <div className="pb-24">
        <MobileHeader title="旅行記" showBack backPath={`/record/${tripId}`} />
        <div className="px-8 pt-20 text-center space-y-5">
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
              <Button onClick={generate} disabled={recordCount === 0} className="w-full h-14 text-base bg-[#3C237D] hover:bg-[#3C237D]/90 rounded-2xl" data-testid="button-generate-journal">
                <Sparkles className="h-5 w-5 mr-2" /> 旅行記をつくる
              </Button>
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
              <p className="text-xs text-muted-foreground">{trip.isPublic ? "リンクを知っている人と、GlobeHubの閲覧ページに表示されます" : "あなたしか見られません"}</p>
            </div>
            <Switch checked={!!trip.isPublic} disabled={busy} onCheckedChange={setPublic} data-testid="switch-public" />
          </div>

          {trip.isPublic && (
            <Button onClick={share} className="w-full h-12 bg-[#3C237D] hover:bg-[#3C237D]/90 rounded-2xl" data-testid="button-share">
              <Share2 className="h-5 w-5 mr-2" /> 共有する
            </Button>
          )}

          <button onClick={() => window.confirm("旅行記を作り直します。手直しした文章は上書きされます。") && generate()} className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground py-2" data-testid="button-regenerate">
            <RefreshCw className="h-4 w-4" /> 記録を追加したら作り直す
          </button>
        </div>
      )}
    </div>
  );
}
