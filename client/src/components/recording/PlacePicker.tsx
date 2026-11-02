import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, LocateFixed, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getCurrentPosition } from "@/lib/quickCapture";
import { cn } from "@/lib/utils";

interface Candidate {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  distanceMeters?: number;
}

interface PlacePickerProps {
  spot: { id: string; lat: number | null; lng: number | null; placeName: string | null; name: string | null };
  /** Where to look when the record has no GPS (e.g. another record of the same trip). */
  bias?: { lat: number; lng: number } | null | undefined;
  onChange: () => void;
}

async function fetchCandidates(params: Record<string, string | number>): Promise<Candidate[]> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`/api/location/candidates?${qs}`, { credentials: "include" });
  return res.ok ? (await res.json()).candidates ?? [] : [];
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Pick the place of one record: one tap on a nearby candidate, or type to search.
 * Library photos often arrive without GPS (iOS strips it), so search must work without coordinates.
 */
export function PlacePicker({ spot, bias, onChange }: PlacePickerProps) {
  const [query, setQuery] = useState("");
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const q = useDebounced(query.trim(), 350);

  const center = spot.lat != null && spot.lng != null ? { lat: spot.lat, lng: spot.lng } : here;
  const searchBias = center ?? bias ?? null;
  const current = spot.placeName || spot.name;

  const nearby = useQuery({
    queryKey: ["place-nearby", center?.lat, center?.lng],
    queryFn: () => fetchCandidates({ method: "current", lat: center!.lat, lng: center!.lng, limit: 8 }),
    enabled: !!center && !q,
    staleTime: Infinity,
  });

  const search = useQuery({
    queryKey: ["place-search", q, searchBias?.lat, searchBias?.lng],
    queryFn: () => fetchCandidates({ method: "search", q, limit: 6, ...(searchBias ? { lat: searchBias.lat, lng: searchBias.lng } : {}) }),
    enabled: q.length >= 1,
    staleTime: 60_000,
  });

  const choose = async (c: { name: string; address?: string; lat?: number; lng?: number }) => {
    setSaving(true);
    try {
      await api.spots.update(spot.id, {
        placeName: c.name.slice(0, 100),
        name: c.name.slice(0, 80),
        ...(c.address ? { address: c.address.slice(0, 200) } : {}),
        // A record without GPS takes the chosen place's coordinates (for the map and nearby search).
        ...(spot.lat == null && c.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng, locationSource: "search" } : {}),
      });
      setQuery("");
      onChange();
    } finally {
      setSaving(false);
    }
  };

  const locate = async () => {
    setLocating(true);
    setHere(await getCurrentPosition());
    setLocating(false);
  };

  const list = q ? search.data : nearby.data;
  const loading = q ? search.isFetching : nearby.isFetching;

  return (
    <div className="space-y-2">
      {current && !query ? (
        <div className="flex items-center gap-2 rounded-xl bg-[#3C237D]/5 px-3 py-2.5">
          <MapPin className="h-4 w-4 text-[#3C237D] shrink-0" />
          <span className="text-sm font-medium flex-1 truncate">{current}</span>
          <button onClick={() => setQuery(current)} className="text-xs text-[#3C237D] font-semibold" data-testid="button-change-place">
            変更
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="場所の名前で探す（例：清水寺）"
              className="h-11 pl-9 pr-9 text-base"
              data-testid="input-place-search"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="クリア">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {!center && !q && (
            <button
              onClick={locate}
              disabled={locating}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#3C237D]/40 py-2.5 text-sm text-[#3C237D]"
              data-testid="button-locate"
            >
              <LocateFixed className="h-4 w-4" /> {locating ? "現在地を取得中…" : "いまいる場所の近くから選ぶ"}
            </button>
          )}

          {(center || q) && (
            <div className="flex flex-wrap gap-2">
              {loading && !list?.length && <span className="text-xs text-muted-foreground py-1">探しています…</span>}
              {list?.map((c) => (
                <button
                  key={`${c.name}-${c.lat}-${c.lng}`}
                  disabled={saving}
                  onClick={() => choose(c)}
                  className={cn("max-w-full flex items-center gap-1.5 rounded-full border border-[#3C237D]/20 bg-white px-3 py-1.5 text-sm active:bg-[#3C237D]/10")}
                >
                  <span className="truncate">{c.name}</span>
                  {!q && c.distanceMeters != null && <span className="text-xs text-muted-foreground shrink-0">{Math.round(c.distanceMeters)}m</span>}
                </button>
              ))}
              {q && !loading && (
                <button
                  disabled={saving}
                  onClick={() => choose({ name: q })}
                  className="rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm text-muted-foreground"
                >
                  「{q}」で決定
                </button>
              )}
              {!q && !loading && !list?.length && <span className="text-xs text-muted-foreground py-1">近くの候補がありません。名前で探してください</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
