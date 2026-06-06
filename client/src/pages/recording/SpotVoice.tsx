import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RecordProgress } from "@/components/recording/RecordProgress";
import { AiFormatButton } from "@/components/common/AiFormatButton";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Mic, Square, Pencil, RotateCcw, Check, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MAX_CHARS = 500;

export default function SpotVoice() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const spotId = new URLSearchParams(search).get("spotId");
  const returnTo = new URLSearchParams(search).get("returnTo") || "";
  const { toast } = useToast();

  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textValue, setTextValue] = useState("");

  const {
    transcript,
    interimText,
    isRecording,
    isEditMode,
    editValue,
    isSupported,
    startRecording,
    stopRecording,
    reset: handleReset,
    handleOpenEdit,
    handleConfirmEdit,
    setEditValue,
    setTranscriptValue,
  } = useVoiceRecorder();

  // Recording elapsed timer
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  useEffect(() => {
    if (!isRecording) { setRecordingSeconds(0); return; }
    const id = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);
  const fmtTimer = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const { data: spot } = useQuery({
    queryKey: ["/api/spots", spotId],
    queryFn: async () => {
      const res = await fetch(`/api/spots/${spotId}`);
      if (!res.ok) throw new Error("Failed to fetch spot");
      return res.json();
    },
    enabled: !!spotId,
  });

  useEffect(() => {
    if (spot?.impressionRemarks && !transcript && !textValue) {
      setTranscriptValue(spot.impressionRemarks);
      setTextValue(spot.impressionRemarks);
    }
  }, [spot]);

  const exitAfterSaveRef = useRef(false);

  const saveVoiceMutation = useMutation({
    mutationFn: async () => {
      const value =
        inputMode === "text"
          ? textValue.trim()
          : isEditMode
          ? editValue.trim()
          : transcript.trim();
      return apiRequest("PATCH", `/api/spots/${spotId}`, { impressionRemarks: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spots", spotId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      if (exitAfterSaveRef.current) {
        exitAfterSaveRef.current = false;
        navigate(`/record/${tripId}`);
      } else if (returnTo === "preview") {
        navigate(`/record/${tripId}/preview`);
      } else {
        navigate(`/record/${tripId}/next-step${spotId ? `?spotId=${spotId}` : ""}`);
      }
    },
    onError: (error: any) => {
      exitAfterSaveRef.current = false;
      toast({ title: "エラー", description: error.message || "保存に失敗しました", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (isRecording) stopRecording();
    saveVoiceMutation.mutate();
  };

  const handleSkip = () => {
    if (isRecording) stopRecording();
    if (returnTo === "preview") {
      navigate(`/record/${tripId}/preview`);
    } else {
      navigate(`/record/${tripId}/next-step${spotId ? `?spotId=${spotId}` : ""}`);
    }
  };

  const handleSaveAndExit = () => {
    if (isRecording) stopRecording();
    exitAfterSaveRef.current = true;
    saveVoiceMutation.mutate();
  };

  const displayFinal = isEditMode ? editValue : transcript;
  const hasText =
    inputMode === "text"
      ? textValue.trim().length > 0
      : transcript.trim().length > 0 || (isEditMode && editValue.trim().length > 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader
        title="感想を話してください"
        showBack
        backPath={`/record/${tripId}/spot/detail?spotId=${spotId}${returnTo ? `&returnTo=${returnTo}` : ''}`}
      />
      <RecordProgress step={4} />

      {/* 入力モード切り替えトグル */}
      <div className="flex justify-center px-4 pb-2 pt-3">
        <div className="inline-flex rounded-full border bg-muted p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => { if (isRecording) stopRecording(); setInputMode("voice"); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              inputMode === "voice" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            音声
          </button>
          <button
            type="button"
            onClick={() => { if (isRecording) stopRecording(); setInputMode("text"); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              inputMode === "text" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            テキスト
          </button>
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col px-6 py-4 pb-32 gap-6">

        {/* ── テキストモード ── */}
        {inputMode === "text" && (
          <div className="w-full space-y-3">
            <p className="text-muted-foreground text-sm text-center leading-relaxed">
              このスポットの印象に残ったことを<br />自由に書いてください
            </p>
            <Textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value.slice(0, MAX_CHARS))}
              placeholder="例：景色が素晴らしく、地元の人も親切でした。また来たいと思います。"
              className="min-h-[180px] text-base resize-none bg-muted/30"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <AiFormatButton
                notes={textValue}
                spotName={spot?.name}
                onAccept={setTextValue}
              />
              <div className="flex items-center gap-3">
                <span className={`text-xs ${textValue.length >= MAX_CHARS ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {textValue.length} / {MAX_CHARS}
                </span>
                {textValue.trim() && (
                  <button
                    type="button"
                    onClick={() => setTextValue("")}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-3 h-3" />
                    クリア
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 音声モード ── */}
        {inputMode === "voice" && (
          <>
            {(transcript || isEditMode) && (
              <div className="w-full space-y-3">
                {isEditMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">テキストを修正</span>
                      <button type="button" onClick={handleReset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <RotateCcw className="w-3 h-3" />
                        最初から
                      </button>
                    </div>
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value.slice(0, MAX_CHARS) as any)}
                      className="min-h-[120px] text-base resize-none bg-muted/30"
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${editValue.length >= MAX_CHARS ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {editValue.length} / {MAX_CHARS}
                      </span>
                      <Button variant="outline" size="sm" onClick={handleConfirmEdit} className="gap-2">
                        <Check className="w-4 h-4" />
                        修正完了
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full rounded-2xl bg-muted/50 border border-border/50 px-4 py-3 text-base leading-relaxed text-foreground">
                      {displayFinal}
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={handleOpenEdit} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3 h-3" />
                          修正する
                        </button>
                        <AiFormatButton
                          notes={transcript}
                          spotName={spot?.name}
                          onAccept={setTranscriptValue}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{displayFinal.length}文字</span>
                        <button type="button" onClick={handleReset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <RotateCcw className="w-3 h-3" />
                          やり直す
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* マイクボタン */}
            <div className="flex flex-col items-center gap-4">
              {!transcript && !isRecording && (
                <p className="text-muted-foreground text-sm text-center leading-relaxed">
                  このスポットの印象に残ったことを<br />自由に話してください
                </p>
              )}

              {isRecording && interimText && (
                <div className="w-full max-w-xs text-center px-3 py-2 bg-muted/30 rounded-xl border">
                  <p className="text-sm text-muted-foreground leading-relaxed">{interimText}</p>
                </div>
              )}

              <div className="relative flex items-center justify-center">
                {isRecording && (
                  <>
                    <div className="absolute w-32 h-32 rounded-full bg-destructive/10 animate-ping" style={{ animationDuration: "1.5s" }} />
                    <div className="absolute w-26 h-26 rounded-full bg-destructive/15 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.5s" }} />
                  </>
                )}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isSupported}
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
                    isRecording
                      ? "bg-destructive text-white scale-105"
                      : "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isRecording ? <Square className="w-8 h-8 fill-white" /> : <Mic className="w-8 h-8" />}
                </button>
              </div>

              <div className="flex flex-col items-center gap-0.5">
                <p className={`text-sm font-medium ${isRecording ? "text-destructive" : "text-muted-foreground"}`}>
                  {!isSupported
                    ? "このブラウザは音声入力に非対応です"
                    : isRecording
                    ? "● 録音中 — タップして停止"
                    : transcript
                    ? "タップして追記"
                    : "タップして録音開始"}
                </p>
                {isRecording && (
                  <p className="text-xl font-mono font-bold text-destructive tabular-nums">
                    {fmtTimer(recordingSeconds)}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 下部ボタン（固定） */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] p-4 bg-background border-t space-y-2">
        <Button
          disabled={!hasText || saveVoiceMutation.isPending}
          onClick={handleSave}
          className="w-full h-14 text-lg"
        >
          {saveVoiceMutation.isPending ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />保存中...</>
          ) : (
            "保存して次へ"
          )}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSkip} className="flex-1 h-9 text-sm text-muted-foreground">
            スキップ
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveAndExit}
            disabled={saveVoiceMutation.isPending}
            className="flex-1 h-9 text-sm"
            data-testid="button-save-exit"
          >
            保存して終了
          </Button>
        </div>
      </div>
    </div>
  );
}
