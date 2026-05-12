import { useState, useRef, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type State = "idle" | "recording" | "processing";

interface Props {
  onTranscribe: (text: string) => void;
  disabled?: boolean;
}

export function MicButton({ onTranscribe, disabled }: Props) {
  const [state, setState] = useState<State>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("processing");

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "audio.webm");

        try {
          const res = await fetch("/api/ai/transcribe", {
            method: "POST",
            credentials: "include",
            body: form,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "変換に失敗しました");
          }

          const { text } = await res.json();
          if (text?.trim()) {
            onTranscribe(text.trim());
          } else {
            toast({ title: "音声を認識できませんでした", description: "もう一度お試しください", variant: "destructive" });
          }
        } catch (err: any) {
          toast({ title: "エラー", description: err.message || "音声変換に失敗しました", variant: "destructive" });
        } finally {
          setState("idle");
        }
      };

      recorder.start();
      setState("recording");
    } catch {
      toast({ title: "マイクにアクセスできません", description: "ブラウザの設定でマイクを許可してください", variant: "destructive" });
    }
  }, [onTranscribe, toast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  if (state === "processing") {
    return (
      <Button type="button" variant="outline" size="icon" disabled className="shrink-0">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (state === "recording") {
    return (
      <Button
        type="button"
        variant="destructive"
        size="icon"
        onClick={stopRecording}
        className="shrink-0 animate-pulse"
        aria-label="録音を停止"
      >
        <Square className="h-4 w-4 fill-current" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={startRecording}
      disabled={disabled}
      className="shrink-0"
      aria-label="音声入力を開始"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
