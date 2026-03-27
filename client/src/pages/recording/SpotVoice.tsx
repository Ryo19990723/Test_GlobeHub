import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Mic, Square, Pencil, RotateCcw, Check, Keyboard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function SpotVoice() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const spotId = new URLSearchParams(search).get("spotId");
  const { toast } = useToast();

  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textValue, setTextValue] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setIsSupported(false); return; }

    const recognition = new SR();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

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
      if (event.error === "no-speech") return;
      setIsRecording(false);
      setInterimText("");
      if (event.error !== "aborted") {
        toast({ title: "音声認識エラー", description: "マイクへのアクセスを確認してください", variant: "destructive" });
      }
    };

    recognition.onend = () => { setIsRecording(false); setInterimText(""); };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); };
  }, [toast]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    finalTranscriptRef.current = transcript;
    setInterimText("");
    setIsEditMode(false);
    setIsRecording(true);
    recognitionRef.current.start();
  }, [transcript]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
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
      setShowCompleteModal(true);
    },
    onError: (error: any) => {
      toast({ title: "エラー", description: error.message || "保存に失敗しました", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (isRecording) stopRecording();
    saveVoiceMutation.mutate();
  };

  const handleSkip = () => { setShowCompleteModal(true); };

  const handleAddAnother = async () => {
    setShowCompleteModal(false);
    const newSpot = await apiRequest("POST", `/api/trips/${tripId}/spots`, { name: "" });
    navigate(`/record/${tripId}/spot/photo?spotId=${newSpot.id}`);
  };

  const handleGoToSummary = () => {
    setShowCompleteModal(false);
    navigate(`/record/${tripId}/cover`);
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
        backPath={`/record/${tripId}/spot/detail?spotId=${spotId}`}
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

      {/* メインエリア：マイクを中心に配置 */}
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-4 pb-32">

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
            {!transcript && !isRecording && (
              <p className="text-muted-foreground text-sm text-center leading-relaxed">
                このスポットの印象に残ったことを<br />自由に話してください
              </p>
            )}

            <div className="flex flex-col items-center gap-5 my-auto">
              {isRecording && (interimText || transcript) && (
                <div className="w-full max-w-xs text-center">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {transcript}
                    <span className="text-muted-foreground/50">{interimText}</span>
                  </p>
                </div>
              )}

              <div className="relative flex items-center justify-center">
                {isRecording && (
                  <>
                    <div className="absolute w-52 h-52 rounded-full bg-destructive/10 animate-ping" style={{ animationDuration: "1.5s" }} />
                    <div className="absolute w-44 h-44 rounded-full bg-destructive/15 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.4s" }} />
                    <div className="absolute w-36 h-36 rounded-full bg-destructive/20 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.8s" }} />
                  </>
                )}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isSupported}
                  className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
                    isRecording
                      ? "bg-destructive text-white scale-105"
                      : "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isRecording ? <Square className="w-12 h-12 fill-white" /> : <Mic className="w-12 h-12" />}
                </button>
              </div>

              <p className={`text-sm font-medium ${isRecording ? "text-destructive" : "text-muted-foreground"}`}>
                {!isSupported
                  ? "このブラウザは音声入力に非対応です"
                  : isRecording
                  ? "● 録音中 — タップして停止"
                  : transcript
                  ? "もう一度話して追記できます"
                  : "タップして録音開始"}
              </p>
            </div>

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
        <Button variant="ghost" onClick={handleSkip} className="w-full h-9 text-sm text-muted-foreground">
          スキップ
        </Button>
      </div>

      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">スポットを保存しました</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button data-testid="button-add-another-spot" variant="outline" onClick={handleAddAnother} className="w-full h-12">
              + 別のスポットを追加
            </Button>
            <Button data-testid="button-go-to-summary" onClick={handleGoToSummary} className="w-full h-12">
              旅のまとめに進む
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
