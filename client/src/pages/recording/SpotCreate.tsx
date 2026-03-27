import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Save, ArrowLeft } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPicker } from "@/components/common/MapPicker";
import { PhotoUploader } from "@/components/common/PhotoUploader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SpotCreate() {
  const [, params] = useRoute("/record/:tripId/spot/:spotId");
  const [, setLocation] = useLocation();
  const tripId = params?.tripId || "";
  const spotId = params?.spotId === "new" ? null : params?.spotId;
  const isEdit = !!spotId;

  const [name, setName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const { toast } = useToast();

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ["/api/trips", tripId],
    queryFn: () => api.trips.getById(tripId),
    enabled: !!tripId,
  });

  // For editing, get spot data from trip
  const spot = trip?.spots?.find((s: any) => s.id === spotId);

  // Initialize form with spot data when available
  useEffect(() => {
    if (spot && isEdit) {
      setName(spot.name || "");
      setLat(spot.lat);
      setLng(spot.lng);
      setAddress(spot.address || "");
      setNotes(spot.notes || "");
    }
  }, [spot, isEdit]);

  const createSpotMutation = useMutation({
    mutationFn: async (data: any) => {
      const spot = await api.spots.create(tripId, data);
      if (photos.length > 0) {
        await api.photos.upload(spot.id, photos);
      }
      return spot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      toast({
        title: "スポットを追加しました",
      });
      setLocation(`/record/${tripId}`);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "スポットの追加に失敗しました",
        variant: "destructive",
      });
    },
  });

  const updateSpotMutation = useMutation({
    mutationFn: async (data: any) => {
      const updatedSpot = await api.spots.update(spotId!, data);
      if (photos.length > 0) {
        await api.photos.upload(spotId!, photos);
      }
      return updatedSpot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/spots", spotId] });
      toast({
        title: "スポットを更新しました",
      });
      setLocation(`/record/${tripId}`);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "スポットの更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleLocationChange = (newLat: number, newLng: number, newAddress?: string) => {
    setLat(newLat);
    setLng(newLng);
    if (newAddress) {
      setAddress(newAddress);
    }
  };

  const handleSave = () => {
    const data = {
      name: name.trim() || undefined,
      lat,
      lng,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (isEdit) {
      updateSpotMutation.mutate(data);
    } else {
      createSpotMutation.mutate(data);
    }
  };

  const isLoading = tripLoading;
  const isSaving = createSpotMutation.isPending || updateSpotMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileHeader 
          title={isEdit ? "スポットを編集" : "スポットを追加"}
          showBack 
          backPath={`/record/${tripId}`}
        />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader 
        title={isEdit ? "スポットを編集" : "スポットを追加"}
        showBack 
        backPath={`/record/${tripId}`}
        action={{
          icon: Save,
          label: "保存",
          onClick: handleSave,
          testId: "button-save-spot"
        }}
      />

      <main className="flex-1 px-4 py-6">
        <div className="space-y-6 max-w-2xl mx-auto">
          <MapPicker
            lat={lat}
            lng={lng}
            onLocationChange={handleLocationChange}
          />

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="spot-name">スポット名</Label>
              <Input
                id="spot-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 金閣寺、エッフェル塔"
                data-testid="input-spot-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spot-address">住所</Label>
              <Input
                id="spot-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="自動入力または手動入力"
                data-testid="input-spot-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spot-notes">メモ</Label>
              <Textarea
                id="spot-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="このスポットでの思い出や感想を記録..."
                className="min-h-32 resize-none"
                data-testid="textarea-spot-notes"
              />
            </div>

            <div className="space-y-2">
              <Label>写真</Label>
              <PhotoUploader
                photos={photos}
                onPhotosChange={setPhotos}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
