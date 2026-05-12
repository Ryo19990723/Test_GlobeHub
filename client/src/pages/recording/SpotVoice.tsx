import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Mic, Square, Pencil, RotateCcw, Check, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


export default function SpotVoice() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const spotId = new URLSearchParams(search).get("spotId");
  const returnTo = new URLSearchParams(search).get("returnTo") || "";
  const { toast } = useToast();

  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textValue, setTextValue] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);

  // 既存の impressionRemarks を読み込む
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
      const existing = spot.impressionRemarks;
      finalTranscriptRef.current = existing;
      setTranscript(existing);
      setTextValue(existing);
    }
  }, [spot]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setIsSupported(false); return; }

    const recognition = new SR();
    recognition.lang = "ja-JP";
    // continuous=false にすることで、1発話ごとに確定→句読点が正しく入る
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscriptRef.current);
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        // 無音の場合は録音継続（再起動）
        if (isRecordingRef.current) {
          try { recognition.start(); } catch (e) {}
        }
        return;
      }
      setIsRecording(false);
      isRecordingRef.current = false;
      setInterimText("");
      if (event.error !== "aborted") {
        toast({ title: "音声認識エラー", description: "マイクへのアクセスを確認してください", variant: "destructive" });
      }
    };

    recognition.onend = () => {
      setInterimText("");
      // continuous=false の場合、録音中なら自動再起動（句読点が入る区切りで再開）
      if (isRecordingRef.current) {
        try { recognition.start(); } catch (e) {
          setIsRecording(false);
          isRecordingRef.current = false;
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); };
  }, [toast]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    finalTranscriptRef.current = transcript;
    setInterimText("");
    setIsEditMode(false);
    setIsRecording(true);
    isRecordingRef.current = true;
    try {
      recognitionRef.current.start();
    } catch (e) {
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  }, [transcript]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    isRecordingRef.current = false;
    recognitionRef.current.stop();
    setIsRecording(false);
    setInterimText("");
  }, []);

  const handleReset = () => {
    if (isRecording) stopRecording();
    finalTranscriptRef.current = "";
    setTranscript("");
    setInterimText("");
    setIsEditMode(false);
    setEditValue("");
  };

  const handleOpenEdit = () => {
    setEditValue(transcript);
    setIsEditMode(true);
  };

  const handleConfirmEdit = () => {
    finalTranscriptRef.current = editValue;
    setTranscript(editValue);
    setIsEditMode(false);
  };

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
        // スポット完了後は「次のステップ」選択画面へ
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

  const hasText =
    inputMode === "text"
      ? textValue.trim().length > 0
      : transcript.trim().length > 0 || (isEditMode && editValue.trim().length > 0);
  const displayFinal = isEditMode ? editValue : transcript;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader
        title="感想を話してください"
        showBack
        backPath={`/record/${tripId}/spot/detail?spotId=${spotId}${returnTo ? `&returnTo=${returnTo}` : ''}`}
      />

      {/* 入力モード切り替えトグル */}
      <div className="flex justify-center px-4 pb-2">
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
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="例：景色が素晴らしく、地元の人も親切でした。また来たいと思います。"
              className="min-h-[180px] text-base resize-none bg-muted/30"
              autoFocus
            />
            {textValue.trim() && (
              <button
                type="button"
                onClick={() => setTextValue("")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto"
              >
                <RotateCcw className="w-3 h-3" />
                クリア
              </button>
            )}
          </div>
        )}

        {/* ── 音声モード ── */}
        {inputMode === "voice" && (
          <>
            {/* 入力済みテキストを先に表示（マイクボタンより前） */}
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
                      onChange={(e) => setEditValue(e.target.value)}
                      className="min-h-[120px] text-base resize-none bg-muted/30"
                      autoFocus
                    />
                    <Button variant="outline" size="sm" onClick={handleConfirmEdit} className="w-full gap-2">
                      <Check className="w-4 h-4" />
                      修正完了
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full rounded-2xl bg-muted/50 border border-border/50 px-4 py-3 text-base leading-relaxed text-foreground">
                      {displayFinal}
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <button type="button" onClick={handleOpenEdit} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3 h-3" />
                        修正する
                      </button>
                      <button type="button" onClick={handleReset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <RotateCcw className="w-3 h-3" />
                        やり直す
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* マイクボタン（テキストの後に配置） */}
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

              <p className={`text-sm font-medium ${isRecording ? "text-destructive" : "text-muted-foreground"}`}>
                {!isSupported
                  ? "このブラウザは音声入力に非対応です"
                  : isRecording
                  ? "● 録音中 — タップして停止"
                  : transcript
                  ? "タップして追記"
                  : "タップして録音開始"}
              </p>
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
