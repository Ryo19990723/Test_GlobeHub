
import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { MapPin, ExternalLink } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { fetchSpotDetail, type Spot } from "./api";

export default function SpotDetail() {
  const [, params] = useRoute("/discover/spot/:cityId/:spotId");
  const spotId = params?.spotId || "";
  const cityId = params?.cityId || "";
  const [loading, setLoading] = useState(true);
  const [spot, setSpot] = useState<Spot | null>(null);

  useEffect(() => {
    if (spotId) {
      fetchSpotDetail(spotId).then((data) => {
        setSpot(data);
        setLoading(false);
      });
    }
  }, [spotId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>スポットが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader
        title={spot.name}
        showBack
        backPath={`/discover/spot/${cityId}`}
      />

      <main className="flex-1">
        <div className="overflow-x-auto">
          <div className="flex gap-2 px-4 py-2">
            {spot.photos.map((photo, idx) => (
              <img
                key={idx}
                src={photo}
                alt={`${spot.name} ${idx + 1}`}
                className="aspect-square w-80 object-cover rounded-2xl flex-shrink-0"
              />
            ))}
          </div>
        </div>

        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{spot.name}</h1>
            <Badge variant="secondary">{spot.category}</Badge>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">概要</h2>
            <p className="text-muted-foreground">{spot.summary}</p>
          </div>

          {spot.mapUrl && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(spot.mapUrl, "_blank")}
            >
              <MapPin className="h-4 w-4 mr-2" />
              地図を開く
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
