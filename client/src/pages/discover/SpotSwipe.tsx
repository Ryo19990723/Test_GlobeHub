
import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { X, Heart, Save } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SpotCardSquare } from "./components/SpotCardSquare";
import { fetchCitySpots, type Spot } from "./api";

export default function SpotSwipe() {
  const [, params] = useRoute("/discover/spot/:cityId");
  const cityId = params?.cityId || "";
  const [loading, setLoading] = useState(true);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<Spot[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (cityId) {
      fetchCitySpots(cityId).then((data) => {
        setSpots(data);
        setLoading(false);
      });
    }
  }, [cityId]);

  const handlePass = () => {
    if (currentIndex < spots.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleLike = () => {
    setLiked([...liked, spots[currentIndex]]);
    if (currentIndex < spots.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleFinish = () => {
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const currentSpot = spots[currentIndex];

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader
        title="スポットを見つける"
        showBack
        backPath={`/discover/${cityId}`}
      />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {currentSpot ? (
          <div className="w-full max-w-md space-y-6">
            <div className="text-center text-sm text-muted-foreground mb-4">
              {currentIndex + 1} / {spots.length}
            </div>

            <SpotCardSquare {...currentSpot} />

            <div className="sticky bottom-4 flex gap-3 w-full max-w-md mx-auto">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 rounded-full"
                onClick={handlePass}
              >
                <X className="h-5 w-5 mr-2" />
                PASS
              </Button>
              <Button
                size="lg"
                className="flex-1 rounded-full"
                onClick={handleLike}
              >
                <Heart className="h-5 w-5 mr-2" />
                LIKE
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full px-6"
                onClick={handleFinish}
              >
                終了
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg mb-4">すべてのスポットを見ました</p>
            <Button onClick={handleFinish}>
              <Save className="h-4 w-4 mr-2" />
              保存したスポットを見る
            </Button>
          </div>
        )}
      </main>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存したスポット ({liked.length}件)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {liked.map((spot) => (
              <div key={spot.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                <img
                  src={spot.photos[0]}
                  alt={spot.name}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium">{spot.name}</p>
                  <p className="text-xs text-muted-foreground">{spot.category}</p>
                </div>
              </div>
            ))}
            {liked.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                保存したスポットはありません
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowModal(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
