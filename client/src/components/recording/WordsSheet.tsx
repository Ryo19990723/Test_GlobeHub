import { useEffect, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { cn } from "@/lib/utils";

interface WordsSheetProps {
  open: boolean;
  initialText?: string | undefined;
  photoUrl?: string | null | undefined;
  /** Start listening as soon as the sheet opens (the 🎙 button). */
  autoStart?: boolean | undefined;
  saving?: boolean | undefined;
  onSave: (text: string) => void;
  onClose: () => void;
  onDelete?: (() => void) | undefined;
}

/** "ひとこと" for one record: speak (browser speech recognition, free) or type. */
export function WordsSheet({ open, initialText = "", photoUrl, autoStart, saving, onSave, onClose, onDelete }: WordsSheetProps) {
  const voice = useVoiceRecorder();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      voice.reset();
      setReady(false);
      return;
    }
    voice.setTranscriptValue(initialText);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && ready && autoStart && voice.isSupported) voice.startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ready]);

  const text = voice.transcript + (voice.isRecording ? voice.interimText : "");

  const save = () => {
    if (voice.isRecording) voice.stopRecording();
    onSave(voice.transcript.trim());
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-w-[420px] mx-auto">
        <DrawerHeader className="text-left">
          <DrawerTitle>ひとこと</DrawerTitle>
          <DrawerDescription>話すか、入力してください。あとで旅行記になります。</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4">
          {photoUrl && <img src={photoUrl} alt="" className="w-full h-40 object-cover rounded-xl" />}

          <Textarea
            value={text}
            onChange={(e) => voice.setTranscriptValue(e.target.value)}
            readOnly={voice.isRecording}
            placeholder={voice.isSupported ? "例：朝7時、人が少なくて鳥居がきれい" : "この端末は音声入力に対応していません。入力してください"}
            className="min-h-[96px] text-base"
            data-testid="input-words"
          />

          {voice.isSupported && (
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
                className={cn(
                  "h-16 w-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95",
                  voice.isRecording ? "bg-red-500 animate-pulse" : "bg-[#3C237D]",
                )}
                aria-label={voice.isRecording ? "録音を止める" : "話す"}
                data-testid="button-mic"
              >
                {voice.isRecording ? <Square className="h-6 w-6" fill="currentColor" /> : <Mic className="h-7 w-7" />}
              </button>
              <span className="text-xs text-muted-foreground">{voice.isRecording ? "聞いています…（タップで止める）" : "タップして話す"}</span>
            </div>
          )}

          <div className="flex gap-2">
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete} aria-label="この記録を削除" data-testid="button-delete-record">
                <Trash2 className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              {initialText ? "閉じる" : "スキップ"}
            </Button>
            <Button className="flex-1 bg-[#3C237D] hover:bg-[#3C237D]/90" onClick={save} disabled={saving} data-testid="button-save-words">
              {saving ? "保存中…" : "保存"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
