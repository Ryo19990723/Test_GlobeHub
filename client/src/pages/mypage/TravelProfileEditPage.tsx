import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TravelProfileQuiz } from "@/pages/onboarding/TravelProfileQuiz";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { MobileHeader } from "@/components/common/MobileHeader";

async function saveProfile(answers: Record<string, string | string[]>) {
  const res = await fetch("/api/me/travel-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(answers),
  });
  if (!res.ok) throw new Error("保存に失敗しました");
}

export default function TravelProfileEditPage() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/me/travel-profile"],
    queryFn: async () => {
      const res = await fetch("/api/me/travel-profile", { credentials: "include" });
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader title="旅のプロファイル" showBack backPath="/mypage" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // 保存済み回答を初期値として渡す
  const profile = data?.profile ?? {};
  const initialAnswers: Record<string, string | string[]> = {};
  const jsonFields = ["quizExperiences", "quizAccommodations", "quizFood", "quizTransport", "quizCompanions", "quizRegions"];
  for (const key of Object.keys(profile)) {
    if (!key.startsWith("quiz")) continue;
    const val = profile[key];
    if (!val) continue;
    initialAnswers[key] = jsonFields.includes(key) ? JSON.parse(val) : val;
  }

  return (
    <TravelProfileQuiz
      title="旅のプロファイルを編集"
      initialAnswers={initialAnswers}
      onComplete={async (answers) => {
        await saveProfile(answers);
        setLocation("/mypage");
      }}
      onSkip={() => setLocation("/mypage")}
    />
  );
}
