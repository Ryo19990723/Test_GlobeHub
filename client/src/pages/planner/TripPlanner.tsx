import { useState, useCallback } from "react";
import { Sparkles, Globe, Loader2, RefreshCw, Plus, Check, Copy, Share2 } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const DAYS_OPTIONS = [3,4,5,7,10,14];

// ── 型定義 ──────────────────────────────────────────────────
interface Spot {
  id: string;
  name: string;
  summary: string;
  mustSee: boolean;
}

interface Category {
  name: string;
  spots: Spot[];
}

// ── 同行者・テーマ選択肢 ─────────────────────────────────────
const COMPANION_OPTIONS = [
  { value: "solo", label: "一人旅", emoji: "🧳" },
  { value: "couple", label: "カップル・夫婦", emoji: "❤️" },
  { value: "friends", label: "友人グループ", emoji: "👫" },
  { value: "family", label: "家族（子連れ）", emoji: "👨‍👩‍👧" },
];

const INTEREST_OPTIONS = [
  { value: "history", label: "歴史・文化", emoji: "🏛️" },
  { value: "nature", label: "自然・絶景", emoji: "🏔️" },
  { value: "food", label: "グルメ", emoji: "🍜" },
  { value: "art", label: "アート・デザイン", emoji: "🎨" },
  { value: "shopping", label: "ショッピング", emoji: "🛍️" },
  { value: "hidden", label: "穴場・ローカル", emoji: "🗺️" },
];

// ── SpotCard ─────────────────────────────────────────────────
function SpotCard({ spot, selected, onToggle }: { spot: Spot; selected: boolean; onToggle: () => void }) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
        selected ? "border-[#3C237D] bg-[#3C237D]/5" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {spot.mustSee && (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
              定番
            </span>
          )}
          <p className={`text-sm font-semibold truncate ${selected ? "text-[#3C237D]" : "text-gray-900"}`}>
            {spot.name}
          </p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{spot.summary}</p>
      </div>
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
          selected
            ? "border-[#3C237D] bg-[#3C237D] text-white"
            : "border-gray-300 hover:border-[#3C237D]"
        }`}
      >
        {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-gray-400" />}
      </button>
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function TripPlanner() {
  // Step 1: 基本情報
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState<number>(7);
  const [budget, setBudget] = useState<"budget" | "moderate" | "high">("moderate");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);

  // Step 2: このたびの詳細（状況によって変わる項目）
  const [companion, setCompanion] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);

  const [phase, setPhase] = useState<"form" | "results">("form");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [webSearched, setWebSearched] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  const handleSharePlan = useCallback(() => {
    // 選択したスポットを全カテゴリから収集
    const lines: string[] = [`📍 ${destination} ${days}日間プラン（${month}）\n`];
    for (const cat of categories) {
      const selected = cat.spots.filter((s) => selectedIds.has(s.id));
      if (selected.length === 0) continue;
      lines.push(`【${cat.name}】`);
      selected.forEach((s) => lines.push(`・${s.name}${s.mustSee ? " ★" : ""}`));
      lines.push("");
    }
    lines.push("by GlobeHub AI");
    const text = lines.join("\n");

    const canShare = "share" in navigator;
    if (canShare) {
      (navigator as any).share({ title: `${destination}旅行プラン`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: "クリップボードにコピーしました" });
      });
    }
  }, [categories, selectedIds, destination, days, month, toast]);

  const toggleInterest = (v: string) =>
    setInterests((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const toggleSpot = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSearch = async () => {
    if (!destination.trim()) {
      toast({ title: "行き先を入力してください", variant: "destructive" });
      return;
    }
    setLoading(true);
    setCategories([]);
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/ai/spot-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          destination: destination.trim(),
          month,
          tripStyle: budget,
          companions: companion,
          interests,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "スポットの取得に失敗しました");
      }
      const data = await res.json();
      setCategories(data.categories ?? []);
      setWebSearched(!!data.webSearched);
      setPhase("results");
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MobileHeader title="AI旅行計画" showBack backPath="/" />

      <main className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full pb-24">

        {/* ── フォーム ── */}
        <div className="space-y-4 mb-5">
          <div className="space-y-1.5">
            <Label>行き先</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="例: スペイン、バルセロナ、南イタリア"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>期間</Label>
              <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS_OPTIONS.map((d) => <SelectItem key={d} value={String(d)}>{d}日間</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>時期</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>予算感</Label>
            <div className="flex gap-2">
              {(["budget","moderate","high"] as const).map((b) => (
                <button key={b} onClick={() => setBudget(b)}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                    budget === b ? "bg-[#3C237D] text-white border-[#3C237D]" : "bg-white text-gray-600 border-gray-200"
                  }`}>
                  {b === "budget" ? "節約" : b === "moderate" ? "標準" : "余裕あり"}
                </button>
              ))}
            </div>
          </div>

          {/* 今回の旅の状況（毎回変わりうる） */}
          <div className="space-y-1.5">
            <Label>今回の同行者</Label>
            <div className="grid grid-cols-2 gap-2">
              {COMPANION_OPTIONS.map((c) => (
                <button key={c.value} onClick={() => setCompanion(companion === c.value ? "" : c.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                    companion === c.value ? "border-[#3C237D] bg-[#3C237D]/5 text-[#3C237D]" : "border-gray-200 text-gray-700"
                  }`}>
                  <span>{c.emoji}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>今回の旅で特に重視したいこと（複数可）</Label>
            <div className="grid grid-cols-2 gap-2">
              {INTEREST_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => toggleInterest(o.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                    interests.includes(o.value) ? "border-[#3C237D] bg-[#3C237D]/5 text-[#3C237D]" : "border-gray-200 text-gray-700"
                  }`}>
                  <span>{o.emoji}</span>{o.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSearch} disabled={loading || !destination.trim()}
            className="w-full gap-2 bg-[#3C237D] hover:bg-[#2E1A64] h-12">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />スポットを探しています...</> : <><Sparkles className="h-4 w-4" />おすすめスポットを見つける</>}
          </Button>
        </div>

        {/* ── スポット結果 ── */}
        {phase === "results" && categories.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{destination}のおすすめスポット</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  気になる場所を選んでリストに追加しよう
                  {webSearched && " • Web検索済み"}
                </p>
              </div>
              {selectedCount > 0 && (
                <span className="text-xs font-medium text-[#3C237D] bg-[#3C237D]/10 px-2 py-1 rounded-full">
                  {selectedCount}件選択中
                </span>
              )}
            </div>

            {categories.map((cat) => (
              <div key={cat.name}>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3C237D] inline-block" />
                  {cat.name}
                </h3>
                <div className="space-y-2">
                  {cat.spots.map((spot) => (
                    <SpotCard
                      key={spot.id}
                      spot={spot}
                      selected={selectedIds.has(spot.id)}
                      onToggle={() => toggleSpot(spot.id)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={handleSearch} disabled={loading} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />別のスポットを探す
            </Button>
          </div>
        )}
      </main>

      {/* 選択スポット数の固定フッター */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] p-4 bg-white border-t space-y-2">
          {(() => {
            const canShare = "share" in navigator;
            return (
              <>
                <div className="flex items-center justify-between text-sm text-gray-600 px-1">
                  <span className="font-medium text-[#3C237D]">{selectedCount}件選択中</span>
                  <button onClick={handleSharePlan} className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                    {canShare ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {canShare ? "共有" : "コピー"}
                  </button>
                </div>
                <Button onClick={handleSharePlan} className="w-full h-11 bg-[#3C237D] hover:bg-[#2E1A64] gap-2">
                  <Check className="h-4 w-4" />
                  プランを{canShare ? "共有" : "コピー"}する
                </Button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
