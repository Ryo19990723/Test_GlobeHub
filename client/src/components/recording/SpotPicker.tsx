import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Image as ImageIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

interface SpotCandidate {
  placeId: string;
  name: string;
  category?: string | undefined;
  address?: string | undefined;
  lat: number;
  lng: number;
  distanceMeters?: number | undefined;
  source: "current" | "photo" | "search";
  provider: "nominatim" | "overpass" | "photon";
  confidence: number;
}

interface SpotPickerProps {
  onSelect: (candidate: SpotCandidate) => void;
  defaultTab?: "current" | "search" | "photo";
  initialLat?: number;
  initialLng?: number;
  spotId?: string;
  disablePhotoTab?: boolean;
  isSubmitting?: boolean;
}

// ── 距離計算 ──────────────────────────────────────────────
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Photon API 直接呼び出し ───────────────────────────────
async function searchPhoton(
  query: string,
  lat?: number,
  lng?: number,
  limit = 15
): Promise<SpotCandidate[]> {
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (lat !== undefined && lng !== undefined) {
      params.set("lat", String(lat));
      params.set("lon", String(lng));
    }
    const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
      headers: { "User-Agent": "GlobeHub/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features ?? [])
      .filter((f: any) => f.properties.name)
      .map((f: any) => {
        const [fLng, fLat] = f.geometry.coordinates as [number, number];
        const p = f.properties;
        const distance =
          lat !== undefined && lng !== undefined
            ? calcDistance(lat, lng, fLat, fLng)
            : undefined;
        const addrParts = [p.street, p.city, p.state, p.country].filter(Boolean);
        const candidate: SpotCandidate = {
          placeId: `photon:${p.osm_type ?? ""}${p.osm_id ?? ""}`,
          name: p.name,
          source: "search",
          provider: "photon",
          lat: fLat,
          lng: fLng,
          confidence: 0.9,
        };
        if (p.osm_value || p.osm_key) candidate.category = p.osm_value ?? p.osm_key;
        if (addrParts.length) candidate.address = addrParts.join(", ");
        if (distance !== undefined) candidate.distanceMeters = distance;
        return candidate;
      });
  } catch {
    return [];
  }
}

// ── Nominatim API 直接呼び出し ────────────────────────────
async function searchNominatim(
  query: string,
  lat?: number,
  lng?: number,
  limit = 10
): Promise<SpotCandidate[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      namedetails: "1",
      limit: String(limit),
      "accept-language": "ja,en",
    });
    // 広いビューボックスを参考値として使用（boundedなし）
    if (lat !== undefined && lng !== undefined) {
      params.set("viewbox", `${lng - 1},${lat - 1},${lng + 1},${lat + 1}`);
    }
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        "User-Agent": "GlobeHub/1.0",
        "Accept-Language": "ja,en",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data ?? []).map((item: any) => {
      const itemLat = parseFloat(item.lat);
      const itemLng = parseFloat(item.lon);
      const distance =
        lat !== undefined && lng !== undefined
          ? calcDistance(lat, lng, itemLat, itemLng)
          : undefined;
      const name =
        item.namedetails?.["name:ja"] ??
        item.namedetails?.name ??
        item.display_name.split(",")[0];
      const candidate: SpotCandidate = {
        placeId: `nominatim:${item.place_id}`,
        name,
        source: "search",
        provider: "nominatim",
        lat: itemLat,
        lng: itemLng,
        confidence: Math.min(0.85, (item.importance ?? 0.5) + 0.3),
      };
      if (item.type) candidate.category = item.type;
      if (item.display_name) candidate.address = item.display_name;
      if (distance !== undefined) candidate.distanceMeters = distance;
      return candidate;
    });
  } catch {
    return [];
  }
}

// ── カテゴリアイコン ──────────────────────────────────────
function getCategoryIcon(category?: string): string {
  if (!category) return "📍";
  const c = category.toLowerCase();
  if (c.includes("tourism") || c.includes("attraction") || c.includes("museum")) return "🏛️";
  if (c.includes("restaurant") || c.includes("cafe") || c.includes("food")) return "🍽️";
  if (c.includes("hotel") || c.includes("accommodation") || c.includes("lodging")) return "🏨";
  if (c.includes("park") || c.includes("nature") || c.includes("garden")) return "🌳";
  if (c.includes("shop") || c.includes("store") || c.includes("mall")) return "🛍️";
  if (c.includes("temple") || c.includes("shrine") || c.includes("religious")) return "⛩️";
  if (c.includes("station") || c.includes("transport") || c.includes("bus")) return "🚉";
  return "📍";
}

// ── メインコンポーネント ──────────────────────────────────
export function SpotPicker({
  onSelect,
  defaultTab = "current",
  initialLat,
  initialLng,
  spotId,
  disablePhotoTab = false,
  isSubmitting = false,
}: SpotPickerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [candidates, setCandidates] = useState<SpotCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<SpotCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // 初期タブが current → 現在地取得
  useEffect(() => {
    if (initialLat && initialLng) {
      setUserLocation({ lat: initialLat, lng: initialLng });
    } else if (activeTab === "current") {
      handleGetCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // タブ切り替え時に候補をリセット
  useEffect(() => {
    setCandidates([]);
    setSelectedCandidate(null);
    if (activeTab === "current") {
      handleGetCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── 現在地取得 ──────────────────────────────────────────
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "位置情報が利用できません",
        description: "このブラウザは位置情報をサポートしていません",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });
        try {
          const res = await fetch(
            `/api/location/candidates?method=current&lat=${lat}&lng=${lng}&radius=300&limit=20`
          );
          if (!res.ok) throw new Error();
          const data = await res.json();
          setCandidates(data.candidates || []);
        } catch {
          toast({
            title: "周辺スポットの取得に失敗しました",
            description: "検索タブからスポット名を検索してください",
          });
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        toast({
          title: "位置情報を取得できませんでした",
          description: "検索タブからスポット名を検索してください",
        });
      }
    );
  };

  // ── 写真タブ ────────────────────────────────────────────
  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/location/candidates/photo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      const data = await res.json();
      setCandidates(data.candidates || []);
      if (data.exif) {
        setUserLocation({ lat: data.exif.lat, lng: data.exif.lng });
        toast({ title: `${data.candidates?.length || 0}件の候補が見つかりました` });
      }
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "写真の位置情報を読み取れませんでした",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── 検索（Photon + Nominatim 直接呼び出し）──────────────
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!value.trim()) {
      setCandidates([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setCandidates([]);
      setSelectedCandidate(null);
      try {
        const lat = userLocation?.lat;
        const lng = userLocation?.lng;

        // Photon と Nominatim を並列実行
        const [photonResults, nominatimResults] = await Promise.all([
          searchPhoton(value, lat, lng, 15),
          searchNominatim(value, lat, lng, 10),
        ]);

        // Photon を先に、重複（50m以内）を除外して Nominatim を追加
        const merged: SpotCandidate[] = [...photonResults];
        for (const nom of nominatimResults) {
          const isDupe = merged.some(
            (r) =>
              Math.abs(r.lat - nom.lat) < 0.0005 &&
              Math.abs(r.lng - nom.lng) < 0.0005
          );
          if (!isDupe) merged.push(nom);
        }

        // confidence 降順でソート
        merged.sort((a, b) => b.confidence - a.confidence);
        setCandidates(merged.slice(0, 20));
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current" className="gap-2">
            <Navigation className="h-4 w-4" />
            現在地
          </TabsTrigger>
          <TabsTrigger value="photo" className="gap-2" disabled={disablePhotoTab}>
            <ImageIcon className="h-4 w-4" />
            写真
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            検索
          </TabsTrigger>
        </TabsList>

        {/* 現在地タブ */}
        <TabsContent value="current" className="space-y-3">
          {loading && <LoadingSpinner />}
          {!loading && candidates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Navigation className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">現在地を取得中...</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleGetCurrentLocation}
              >
                再取得
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 写真タブ */}
        <TabsContent value="photo" className="space-y-3">
          {loading && <LoadingSpinner />}
          {!loading && (
            <div className="text-center py-6 text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-3">位置情報付き写真を選択</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("photo-input")?.click()}
              >
                写真を選ぶ
              </Button>
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>
          )}
        </TabsContent>

        {/* 検索タブ */}
        <TabsContent value="search" className="space-y-3">
          <Input
            placeholder="例：浅草寺、東京タワー、Eiffel Tower..."
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            data-testid="input-search-spot"
            autoFocus
          />
          {loading && <LoadingSpinner />}
          {!loading && searchQuery.trim() && candidates.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>「{searchQuery}」に一致するスポットが見つかりません</p>
              <p className="text-xs mt-1">別のキーワードや英語でも試してみてください</p>
            </div>
          )}
          {!loading && !searchQuery.trim() && (
            <p className="text-xs text-muted-foreground text-center py-2">
              日本語・英語どちらでも検索できます
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* 候補リスト（全タブ共通） */}
      {candidates.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {candidates.map((candidate, index) => (
            <Card
              key={candidate.placeId}
              className={`cursor-pointer hover-elevate transition-all ${
                selectedCandidate?.placeId === candidate.placeId
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => setSelectedCandidate(candidate)}
              data-testid={`candidate-${index}`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {getCategoryIcon(candidate.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm line-clamp-1">
                        {candidate.name}
                      </h4>
                      {candidate.distanceMeters !== undefined && (
                        <Badge variant="secondary" className="flex-shrink-0 text-xs">
                          {candidate.distanceMeters < 1000
                            ? `${Math.round(candidate.distanceMeters)}m`
                            : `${(candidate.distanceMeters / 1000).toFixed(1)}km`}
                        </Badge>
                      )}
                    </div>
                    {candidate.category && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {candidate.category}
                      </p>
                    )}
                    {candidate.address && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {candidate.address}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 決定ボタン */}
      {selectedCandidate && (
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={() => {
            if (!selectedCandidate.lat || !selectedCandidate.lng) {
              toast({
                title: "エラー",
                description: "位置情報が取得できませんでした",
                variant: "destructive",
              });
              return;
            }
            onSelect({
              lat: selectedCandidate.lat,
              lng: selectedCandidate.lng,
              name: selectedCandidate.name,
              address: selectedCandidate.address,
              placeId: selectedCandidate.placeId,
              provider: selectedCandidate.provider,
              category: selectedCandidate.category,
              source: selectedCandidate.source,
              confidence: selectedCandidate.confidence,
            });
          }}
          disabled={loading || isSubmitting}
          data-testid="button-confirm-candidate"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner />
              処理中...
            </>
          ) : (
            <>
              <MapPin className="h-5 w-5" />
              この場所に決定して次へ
            </>
          )}
        </Button>
      )}
    </div>
  );
}
