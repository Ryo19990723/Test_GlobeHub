import { useState } from "react";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  notes: string;
  spotName?: string;
  address?: string;
  onAccept: (formatted: string) => void;
}

export function AiFormatButton({ notes, spotName, address, onAccept }: Props) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFormat = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/ai/format-spot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes, spotName, address }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "整形に失敗しました");
      }
      const { formatted } = await res.json();
      setPreview(formatted);
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (preview) {
      onAccept(preview);
      setPreview(null);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleFormat}
        disabled={!notes.trim() || loading}
        className="gap-1.5 text-xs h-7"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3 text-amber-500" />
        )}
        {loading ? "整形中..." : "AIで整形"}
      </Button>

      {preview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-700">AIが整形した紹介文</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{preview}</p>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleAccept}
              className="gap-1 h-7 text-xs"
            >
              <Check className="h-3 w-3" />
              採用する
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPreview(null)}
              className="gap-1 h-7 text-xs"
            >
              <X className="h-3 w-3" />
              閉じる
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
