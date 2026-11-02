import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Mic, Square, Trash2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlacePicker } from "@/components/recording/PlacePicker";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { addPhotoToSpot } from "@/lib/quickCapture";
import { cn } from "@/lib/utils";

export interface SheetSpot {
  id: string;
  lat: number | null;
  lng: number | null;
  placeName: string | null;
  name: string | null;
  impressionRemarks: string | null;
  photos: { url: string }[];
}

interface WordsSheetProps {
  open: boolean;
  spot?: SheetSpot | null | undefined;
  /** Nearby search hint for records without GPS (another record of the trip). */
  bias?: { lat: number; lng: number } | null | undefined;
  /** Start listening as soon as the sheet opens. */
  autoStart?: boolean | undefined;
  isNew?: boolean | undefined;
  saving?: boolean | undefined;
  onSave: (text: string) => void;
  onClose: () => void;
  onChanged: () => void | Promise<unknown>;
  onDelete?: (() => void) | undefined;
}

/** One record: photo (add later if missing), place (one tap), and "ひとこと" (speak or type). */
export function WordsSheet({ open, spot, bias, autoStart, isNew, saving, onSave, onClose, onChanged, onDelete }: WordsSheetProps) {
  const voice = useVoiceRecorder();
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      voice.reset();
      setReady(false);
      return;
    }
    voice.setTranscriptValue(spot?.impressionRemarks ?? "");
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, spot?.id]);

  useEffect(() => {
    if (open && ready && autoStart && voice.isSupported) voice.startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ready]);

  const text = voice.transcript + (voice.isRecording ? voice.interimText : "");
  const photo = spot?.photos?.[0]?.url;

  const save = () => {
    if (voice.isRecording) voice.stopRecording();
    onSave(voice.transcript.trim());
  };

  const addPhoto = async (files: FileList | null) => {
    if (!files?.[0] || !spot) return;
    setUploading(true);
    try {
      await addPhotoToSpot(spot, files[0]);
      await onChanged();
    } finally {
      setUploading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-w-[420px] mx-auto max-h-[92vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle>{isNew ? "記録しました" : "記録"}</DrawerTitle>
          <DrawerDescription>場所とひとことは、あとからでも追加できます</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          {photo ? (
            <img src={photo} alt="" className="w-full h-40 object-cover rounded-xl" />
          ) : (
            spot && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled={uploading} onClick={() => cameraRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-1.5" /> {uploading ? "追加中…" : "写真を撮る"}
                </Button>
                <Button variant="outline" className="flex-1" disabled={uploading} onClick={() => libraryRef.current?.click()}>
                  <ImagePlus className="h-4 w-4 mr-1.5" /> 写真を選ぶ
                </Button>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addPhoto(e.target.files)} />
                <input ref={libraryRef} type="file" accept="image/*" hidden onChange={(e) => addPhoto(e.target.files)} />
              </div>
            )
          )}

          {spot && (
            <section className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">場所</p>
              <PlacePicker spot={spot} bias={bias} onChange={onChanged} />
            </section>
          )}

          <section className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">ひとこと</p>
            <div className="flex gap-2 items-start">
              <Textarea
                value={text}
                onChange={(e) => voice.setTranscriptValue(e.target.value)}
                readOnly={voice.isRecording}
                placeholder="例：朝7時、人が少なくて鳥居がきれい"
                className="min-h-[80px] text-base flex-1"
                data-testid="input-words"
              />
              {voice.isSupported && (
                <button
                  type="button"
                  onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
                  className={cn(
                    "h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-white shadow transition-transform active:scale-95",
                    voice.isRecording ? "bg-red-500 animate-pulse" : "bg-[#3C237D]",
                  )}
                  aria-label={voice.isRecording ? "録音を止める" : "話して入力"}
                  data-testid="button-mic"
                >
                  {voice.isRecording ? <Square className="h-5 w-5" fill="currentColor" /> : <Mic className="h-5 w-5" />}
                </button>
              )}
            </div>
            {voice.isRecording && <p className="text-xs text-red-500">聞いています…（マイクをもう一度押すと止まります）</p>}
          </section>

          <div className="flex gap-2 pt-1">
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete} aria-label="この記録を削除" data-testid="button-delete-record">
                <Trash2 className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}
            <Button className="flex-1 h-12 bg-[#3C237D] hover:bg-[#3C237D]/90" onClick={save} disabled={saving || uploading} data-testid="button-save-words">
              {saving ? "保存中…" : "完了"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
