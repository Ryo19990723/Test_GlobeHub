import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Mic, Square, Pencil, RotateCcw, Check, Shield, Car, Lightbulb, Heart, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const STEPS = [
  {
    step: 1,
    field: "safetyTips",
    label: "安全に旅するためのポイント",
    icon: Shield,
    hint: "治安、気をつけるべきエリア、注意事項などを話してください",
    placeholder: "例：夜の一人歩きは避けた方がいい地区がありました。スリにも注意が必要です。",
  },
  {
    step: 2,
    field: "transportTips",
    label: "移動手段のポイント",
    icon: Car,
    hint: "交通手段、料金の目安、便利な移動方法などを話してください",
    placeholder: "例：地下鉄が便利でした。タクシーより安くて早いです。",
  },
  {
    step: 3,
    field: "travelTips",
    label: "次の旅人に伝えたいコツ・注意点",
    icon: Lightbulb,
    hint: "役立つ情報、おすすめの過ごし方、失敗談などを話してください",
    placeholder: "例：現地SIMを空港で買うのがおすすめ。クレジットカードはVISAが使いやすかったです。",
  },
  {
    step: 4,
    field: "memorableMoment",
    label: "心に残った瞬間",
    icon: Heart,
    hint: "一番印象に残ったシーン、感動した瞬間を自由に話してください",
    placeholder: "例：夕暮れ時のエッフェル塔が忘れられません。現地の人との会話も楽しかったです。",
  },
] as const;

export default function TripGeneral() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const stepParam = parseInt(new URLSearchParams(search).get("step") ?? "1", 10);
  const currentStepIndex = Math.max(0, Math.min(stepParam - 1, STEPS.length - 1));
  const currentStep = STEPS[currentStepIndex];
  const Icon = currentStep.icon;

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

  // ステップ切り替え時にリセット
  useEffect(() => {
    if (recognitionRef.current) recognitionRef.current.abort();
    finalTranscriptRef.current = "";
    setTranscript("");
    setInterimText("");
    setIsRecording(false);
    setIsEditMode(false);
    setEditValue("");
    setTextValue("");
    setInputMode("voice");
  }, [currentStepIndex]);

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

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest("PATCH", `/api/trips/${tripId}`, {
        [currentStep.field]: value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      if (isRecording) stopRecording();
      if (currentStepIndex < STEPS.length - 1) {
        navigate(`/record/${tripId}/general?step=${currentStepIndex + 2}`);
      } else {
        navigate(`/record/${tripId}/preview`);
      }
    },
    onError: (error: any) => {
      toast({ title: "エラー", description: error.message || "保存に失敗しました", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (isRecording) stopRecording();
    const value =
      inputMode === "text"
        ? textValue.trim()
        : isEditMode
        ? editValue.trim()
        : transcript.trim();
    saveMutation.mutate(value);
  };

  const handleSkip = () => {
    if (isRecording) stopRecording();
    saveMutation.mutate("");
  };

  const backPath =
    currentStepIndex === 0
      ? `/record/${tripId}/cover`
      : `/record/${tripId}/general?step=${currentStepIndex}`;

  const hasText =
    inputMode === "text"
      ? textValue.trim().length > 0
      : transcript.trim().length > 0 || (isEditMode && editValue.trim().length > 0);
  const isLastStep = currentStepIndex === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="旅のまとめ" showBack backPath={backPath} />

      {/* プログレスバー */}
      <div className="px-4 pt-2 pb-1 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium">
            <Icon className="w-3.5 h-3.5 text-primary" />
            {currentStep.label}
          </span>
          <span>{currentStepIndex + 1} / {STEPS.length}</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

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
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-4 pb-32">

        {/* ── テキストモード ── */}
        {inputMode === "text" && (
          <div className="w-full space-y-3">
            <p className="text-muted-foreground text-sm text-center leading-relaxed">
              {currentStep.hint}
            </p>
            <Textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={currentStep.placeholder}
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
                {currentStep.hint}
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
                      placeholder={currentStep.placeholder}
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
                      {transcript}
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
          disabled={!hasText || saveMutation.isPending}
          onClick={handleSave}
          className="w-full h-14 text-lg"
        >
          {saveMutation.isPending ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />保存中...</>
          ) : isLastStep ? (
            "保存して確認へ"
          ) : (
            "保存して次へ"
          )}
        </Button>
        <Button variant="ghost" onClick={handleSkip} disabled={saveMutation.isPending} className="w-full h-9 text-sm text-muted-foreground">
          スキップ
        </Button>
      </div>
    </div>
  );
}
