import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
  className?: string;
}

export function MapPicker({
  lat,
  lng,
  onLocationChange,
  className,
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map with Leaflet (loaded via CDN)
    const initMap = () => {
      if (typeof window === "undefined" || !(window as any).L) {
        setTimeout(initMap, 100);
        return;
      }

      const L = (window as any).L;
      const initialLat = lat || 35.6762;
      const initialLng = lng || 139.6503; // Tokyo default

      const map = L.map(mapRef.current).setView([initialLat, initialLng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
      }).addTo(map);

      marker.on("dragend", (e: any) => {
        const position = e.target.getLatLng();
        onLocationChange(position.lat, position.lng);
      });

      map.on("click", (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        onLocationChange(clickLat, clickLng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && lat && lng) {
      const L = (window as any).L;
      markerRef.current.setLatLng([lat, lng]);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 13);
      }
    }
  }, [lat, lng]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      const results = await response.json();

      if (results.length > 0) {
        const { lat: searchLat, lon: searchLng, display_name } = results[0];
        onLocationChange(parseFloat(searchLat), parseFloat(searchLng), display_name);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([searchLat, searchLng], 13);
        }
        if (markerRef.current) {
          const L = (window as any).L;
          markerRef.current.setLatLng([searchLat, searchLng]);
        }
      } else {
        toast({
          title: "場所が見つかりません",
          description: "別のキーワードで検索してください",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "検索エラー",
        description: "場所の検索に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={className}>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="住所や場所を検索..."
            className="pl-10"
            data-testid="input-location-search"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          data-testid="button-location-search"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "検索"
          )}
        </Button>
      </div>

      <div
        ref={mapRef}
        className="h-[400px] w-full rounded-lg overflow-hidden border shadow-md"
        data-testid="map-container"
      />

      <p className="mt-2 text-xs text-muted-foreground text-center">
        地図をクリックまたはマーカーをドラッグして位置を設定
      </p>
    </div>
  );
}
