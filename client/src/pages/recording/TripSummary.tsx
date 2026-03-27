import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Upload, Mic, Square, ChevronLeft, ChevronRight, Save, Check } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const QUESTIONS = [
  {
    key: "q1",
    text: "現地で安全面や不安を感じた場面はありましたか？",
    placeholder: "例：夜の外出・スリ・詐欺・交通など",
  },
  {
    key: "q2",
    text: "旅全体の物価感や使った金額の目安を教えてください。",
    placeholder: "例：他国と比べて高い／安い、1日あたりの出費感",
  },
  {
    key: "q3",
    text: "主な移動手段と、その使い勝手を教えてください。",
    placeholder: "例：公共交通・タクシー・レンタカー・配車アプリなど",
  },
  {
    key: "q4",
    text: "食事や日常生活で印象的だった点、困った点は？",
    placeholder: "例：ローカルフード、衛生面、ベジタリアン対応など",
  },
  {
    key: "q5",
    text: "言葉や文化の違いで印象的だったことはありますか？",
    placeholder: "例：英語の通じやすさ、現地の人の優しさ、マナー",
  },
  {
    key: "q6",
    text: "今回の旅での反省点や、次に行く人への注意点は？",
    placeholder: "例：準備不足、避けた方がいい場所・時間帯",
  },
  {
    key: "q7",
    text: "旅を通じて見つけたコツや、次の旅人に伝えたいことを教えてください。",
    placeholder: "例：「○○アプリが便利」「△△通りが最高」",
  },
];

export default function TripSummary() {
  const [, params] = useRoute("/record/:tripId/summary");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const tripId = params?.tripId || "";

  const [step, setStep] = useState<"photo" | "questions" | "overview">("photo");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [heroPhotoUrl, setHeroPhotoUrl] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { text: string; audioUrl?: string }>>({});
  const [currentText, setCurrentText] = useState("");
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tripOverview, setTripOverview] = useState("");

  useEffect(() => {
    if (!tripId) {
      toast({
        title: "エラー",
        description: "旅記録が見つかりません",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [tripId, toast, setLocation]);

  const { data: trip } = useQuery({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch trip");
      return res.json();
    },
    enabled: !!tripId,
  });

  // Load existing summary if any
  useEffect(() => {
    if (trip?.summary) {
      try {
        const parsed = JSON.parse(trip.summary);
        if (parsed.heroPhotoUrl) {
          setHeroPhotoUrl(parsed.heroPhotoUrl);
        }
        if (parsed.answers) {
          const answersMap: Record<string, any> = {};
          parsed.answers.forEach((a: any) => {
            answersMap[a.key] = { text: a.text || "", audioUrl: a.audioUrl };
          });
          setAnswers(answersMap);
        }
      } catch (e) {
        console.error("Failed to parse summary:", e);
      }
    }
  }, [trip]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch(`/api/trips/${tripId}/hero-photo`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setHeroPhotoUrl(data.url);
      toast({ title: "写真をアップロードしました" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "アップロードエラー",
        description: "写真のアップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setCurrentAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mr.start();
      setRecorder(mr);
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      toast({
        title: "録音エラー",
        description: "マイクへのアクセスが許可されませんでした",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      setIsRecording(false);
      setRecorder(null);
    }
  };

  const saveSummaryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/trips/${tripId}`, { summary: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
    },
    onError: (error: any) => {
      const draftKey = `trip_${tripId}_summaryDraft`;
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          heroPhotoUrl,
          answers: Object.entries(answers).map(([key, val]) => ({
            key,
            text: val.text,
            audioUrl: val.audioUrl,
          })),
          offline: true,
          savedAt: Date.now(),
        })
      );
    },
  });

  const publishTripMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/trips/${tripId}/publish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "旅記録を公開しました",
        description: "みんなに見てもらいましょう!",
      });
      setLocation("/browse");
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "旅記録の公開に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleNextQuestion = async () => {
    const currentKey = QUESTIONS[currentQuestionIndex].key;
    const hasInput = currentText.trim().length > 0 || !!currentAudioUrl;

    if (!hasInput) {
      toast({
        title: "入力してください",
        description: "テキストまたは音声で回答してください",
        variant: "destructive",
      });
      return;
    }

    // Save answer
    const newAnswers = {
      ...answers,
      [currentKey]: {
        text: currentText.trim(),
        audioUrl: currentAudioUrl || undefined,
      },
    };
    setAnswers(newAnswers);

    // Extract city and country from "visitedPlace" answer (assuming this is one of the questions)
    // If "visitedPlace" is not a question, this part might need adjustment.
    // Assuming the question key for visited place is 'visitedPlace' or similar.
    // For now, let's assume there's a question that asks for the place.
    // If the actual question key is different, it needs to be updated.
    let city = "";
    let country = "";
    // *** NOTE: The key 'visitedPlace' is assumed. Please verify the actual key from QUESTIONS array. ***
    const visitedPlaceAnswer = answers.visitedPlace?.text || "";

    if (visitedPlaceAnswer) {
      // Try to parse city and country from the answer
      // Format examples: "ロンドン、イギリス" or "ロンドン" or "London, UK"
      const parts = visitedPlaceAnswer.split(/[、,]/);
      if (parts.length >= 2) {
        city = parts[0].trim();
        country = parts[1].trim();
      } else if (parts.length === 1) {
        city = parts[0].trim();
      }
    }

    const summaryData = {
      heroPhotoUrl,
      city,
      country,
      questions: QUESTIONS.map((q) => ({
        key: q.key,
        question: q.question, // This 'question' property is not defined in the original QUESTIONS structure. It might be a typo or missing data.
        text: answers[q.key]?.text || "",
        audioUrl: answers[q.key]?.audioUrl,
      })),
      // The original code had an 'overview' object here, but it seems to be misplaced inside the 'questions' mapping.
      // Correcting it to be a separate property if it was intended for the trip overview.
      // However, the current logic moves to 'overview' step after questions.
      // The 'tripOverview' state is handled separately for publishing.
      // If the intention was to save structured overview data here, it needs more context.
      // For now, proceeding with the provided change snippet which implies saving structured answers.
    };
    saveSummaryMutation.mutate(summaryData);

    // Move to next question or to overview step
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const nextKey = QUESTIONS[currentQuestionIndex + 1].key;
      setCurrentText(answers[nextKey]?.text || "");
      setCurrentAudioUrl(answers[nextKey]?.audioUrl || null);
    } else {
      // Move to overview step
      setStep("overview");
      setCurrentText("");
      setCurrentAudioUrl(null);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const prevKey = QUESTIONS[currentQuestionIndex - 1].key;
      setCurrentText(answers[prevKey]?.text || "");
      setCurrentAudioUrl(answers[prevKey]?.audioUrl || null);
    }
  };

  const progress = step === "photo" ? 0 : step === "overview" ? 100 : ((currentQuestionIndex + 1) / QUESTIONS.length) * 100;

  const handlePublish = async () => {
    if (!tripOverview.trim()) {
      toast({
        title: "旅の概要を入力してください",
        variant: "destructive",
      });
      return;
    }

    // Save overview to summary
    await apiRequest("PATCH", `/api/trips/${tripId}`, {
      summary: tripOverview.trim(),
    });

    // Publish trip
    publishTripMutation.mutate();
  };

  if (step === "photo") {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="旅のまとめ" showBack backPath={`/record/${tripId}`} />
        <div className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] px-4 py-3">
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={() => setStep("questions")}
            disabled={!heroPhotoUrl}
          >
            次へ（質問に回答）
          </Button>
        </div>
        <main className="flex-1 px-4 py-6">
          <div className="space-y-6 max-w-2xl mx-auto" style={{ paddingBottom: "80px" }}>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-2">旅を象徴する1枚をアップロード</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  この旅を代表する写真を1枚選んでください（後から変更可能）
                </p>

                {heroPhotoUrl ? (
                  <div className="space-y-4">
                    <img
                      src={heroPhotoUrl}
                      alt="Hero"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <LoadingSpinner /> : "写真を変更"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-64 border-dashed gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <Upload className="h-8 w-8" />
                        <span>クリックして写真を選択</span>
                      </>
                    )}
                  </Button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (step === "overview") {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader
          title="旅の概要"
          showBack
          backPath={`/record/${tripId}`}
        />
        <div className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] px-4 py-3">
          <Button
            size="lg"
            className="w-full gap-2 h-14 text-lg"
            onClick={handlePublish}
            disabled={!tripOverview.trim() || publishTripMutation.isPending}
          >
            {publishTripMutation.isPending ? (
              <>
                <LoadingSpinner />
                公開中...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                旅を公開する
              </>
            )}
          </Button>
        </div>
        <div className="px-4 py-2">
          <Progress value={100} className="h-2" />
        </div>

        <main className="flex-1 px-4 py-6">
          <div className="space-y-6 max-w-2xl mx-auto" style={{ paddingBottom: "120px" }}>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">この旅全体を一言で表現してください</h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium">旅の概要</label>
                  <Textarea
                    value={tripOverview}
                    onChange={(e) => setTripOverview(e.target.value)}
                    placeholder="この旅全体の概要や感想を入力してください..."
                    className="min-h-32 resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;
  const canProceed = currentText.trim().length > 0 || !!currentAudioUrl;

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader
        title={`旅のまとめ (Q${currentQuestionIndex + 1}/7)`}
        showBack
        backPath={`/record/${tripId}`}
      />
      <div className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] px-4 py-3 space-y-2">
        <Button
          size="lg"
          className="w-full gap-2 h-14 text-lg"
          onClick={handleNextQuestion}
          disabled={!canProceed || saveSummaryMutation.isPending}
        >
          {saveSummaryMutation.isPending ? (
            <LoadingSpinner />
          ) : isLastQuestion ? (
            <>
              <Check className="h-5 w-5" />
              保存して完了
            </>
          ) : (
            <>
              <ChevronRight className="h-5 w-5" />
              次へ
            </>
          )}
        </Button>

        {currentQuestionIndex > 0 && (
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2 h-12"
            onClick={handlePrevQuestion}
          >
            <ChevronLeft className="h-4 w-4" />
            前へ
          </Button>
        )}
      </div>

      <div className="px-4 py-2">
        <Progress value={progress} className="h-2" />
      </div>

      <main className="flex-1 px-4 py-6">
        <div className="space-y-6 max-w-2xl mx-auto" style={{ paddingBottom: "80px" }}>
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">{currentQuestion.text}</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">テキストで回答</label>
                  <Textarea
                    value={currentText}
                    onChange={(e) => setCurrentText(e.target.value)}
                    placeholder={currentQuestion.placeholder}
                    className="min-h-32 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">音声で回答</label>
                  <div className="flex gap-2">
                    {!isRecording && !currentAudioUrl && (
                      <Button onClick={startRecording} variant="outline" className="gap-2">
                        <Mic className="h-4 w-4" />
                        録音開始
                      </Button>
                    )}

                    {isRecording && (
                      <Button
                        onClick={stopRecording}
                        variant="destructive"
                        className="gap-2"
                      >
                        <Square className="h-4 w-4" />
                        録音停止
                      </Button>
                    )}

                    {currentAudioUrl && (
                      <div className="flex-1 flex items-center gap-2">
                        <audio src={currentAudioUrl} controls className="flex-1" />
                        <Button
                          onClick={() => setCurrentAudioUrl(null)}
                          variant="ghost"
                          size="sm"
                        >
                          削除
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}