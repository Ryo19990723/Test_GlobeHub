import { useLocation } from "wouter";
import { TravelProfileQuiz } from "./TravelProfileQuiz";

async function saveProfile(answers: Record<string, string | string[]>) {
  const res = await fetch("/api/me/travel-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(answers),
  });
  if (!res.ok) throw new Error("保存に失敗しました");
}

export default function OnboardingQuizPage() {
  const [, setLocation] = useLocation();

  return (
    <TravelProfileQuiz
      title="旅のプロファイルを設定しましょう（所要2分）"
      onComplete={async (answers) => {
        await saveProfile(answers);
        setLocation("/");
      }}
      onSkip={() => setLocation("/")}
    />
  );
}
