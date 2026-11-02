import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Globe, Lock, Check } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { autoTripTitle } from "@/lib/quickCapture";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: false, icon: Lock, title: "自分だけ", body: "旅行記は自分だけが見られます" },
  { value: true, icon: Globe, title: "公開する", body: "旅行記ができたら公開。リンクで共有できます" },
];

/** Start a trip in one tap. Everything else can be filled in later (or never). */
export default function QuickStart() {
  const [, setLocation] = useLocation();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) setLocation("/mypage/login?redirect=/record/new");
  }, [authLoading, isLoggedIn, setLocation]);

  const start = async () => {
    setCreating(true);
    try {
      const trip = await api.trips.create({ title: title.trim() || autoTripTitle(), isPublic } as any);
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setLocation(`/record/${trip.id}`);
    } catch {
      toast({ title: "旅を始められませんでした", variant: "destructive" });
      setCreating(false);
    }
  };

  return (
    <div className="pb-24">
      <MobileHeader title="旅を始める" showBack backPath="/record" />
      <div className="px-4 pt-6 space-y-8">
        <div className="space-y-2">
          <label htmlFor="trip-title" className="text-sm font-semibold">
            旅の名前 <span className="font-normal text-muted-foreground">（あとで変えられます）</span>
          </label>
          <Input
            id="trip-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={autoTripTitle()}
            maxLength={80}
            className="h-12 text-base"
            data-testid="input-trip-title"
          />
          <p className="text-xs text-muted-foreground">空欄なら旅行記をつくるときにAIが名前をつけます</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">旅行記の公開</p>
          <div className="space-y-2" role="radiogroup">
            {OPTIONS.map((o) => (
              <button
                key={o.title}
                role="radio"
                aria-checked={isPublic === o.value}
                onClick={() => setIsPublic(o.value)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
                  isPublic === o.value ? "border-[#3C237D] bg-[#3C237D]/5" : "border-gray-200",
                )}
                data-testid={`option-public-${o.value}`}
              >
                <o.icon className="h-5 w-5 text-[#3C237D] shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">{o.title}</p>
                  <p className="text-xs text-muted-foreground">{o.body}</p>
                </div>
                {isPublic === o.value && <Check className="h-5 w-5 text-[#3C237D]" />}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={start}
          disabled={creating || authLoading}
          className="w-full h-14 text-base font-semibold bg-[#3C237D] hover:bg-[#3C237D]/90 rounded-2xl"
          data-testid="button-start-trip"
        >
          {creating ? "準備中…" : "旅を始める"}
        </Button>
      </div>
    </div>
  );
}
