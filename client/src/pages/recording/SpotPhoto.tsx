
import { useState, useRef, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Upload, Image as ImageIcon, Trash2, MapPin } from "lucide-react";
import ExifReader from "exifreader";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PhotoWithMeta {
  file: File;
  url: string;
  lat?: number;
  lng?: number;
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';
type ExifStatus = 'idle' | 'parsing' | 'done' | 'none' | 'error';

export default function SpotPhoto() {
  const [, params] = useRoute("/record/:tripId/spot/photo");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const tripId = params?.tripId || "";
  const [spotId, setSpotId] = useState(new URLSearchParams(window.location.search).get("spotId") || "");
  const returnTo = new URLSearchParams(window.location.search).get("returnTo") || "";
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PhotoWithMeta[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [exifStatus, setExifStatus] = useState<ExifStatus>('idle');

  const { data: spot } = useQuery({
    queryKey: ["/api/spots", spotId],
    queryFn: async () => {
      const res = await fetch(`/api/spots/${spotId}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch spot");
      return res.json();
    },
    enabled: !!spotId,
  });

  const ensureSpotId = async (): Promise<string> => {
    if (spotId) return spotId;
    const res = await fetch(`/api/trips/${tripId}/spots/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to create draft spot: ${res.status}`);
    const data = await res.json();
    const newSpotId = data.spotId || data.id;
    setSpotId(newSpotId);
    const newSearch = `?spotId=${newSpotId}${returnTo ? `&returnTo=${returnTo}` : ''}`;
    window.history.replaceState(null, '', `/record/${tripId}/spot/photo${newSearch}`);
    return newSpotId;
  };

  const uploadPhotosMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const currentSpotId = await ensureSpotId();
      const formData = new FormData();
      files.forEach((file) => formData.append("photos", file));
      const res = await fetch(`/api/spots/${currentSpotId}/photos`, {
        method: "POST",
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${res.status} - ${errorText}`);
      }
      return res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/spots", spotId] });
      setUploadStatus('done');
      // 自動で位置決め画面に遷移
      const currentSpotId = spotId || await ensureSpotId();
      // GPS座標をsessionStorageに保存
      const gpsPoints = photos.filter(p => p.lat && p.lng).map(p => ({ lat: p.lat!, lng: p.lng! }));
      if (gpsPoints.length > 0) {
        sessionStorage.setItem(`spot_${currentSpotId}_photoMeta`, JSON.stringify({
          lat: gpsPoints[0].lat,
          lng: gpsPoints[0].lng,
          allPoints: gpsPoints,
        }));
      } else {
        sessionStorage.removeItem(`spot_${currentSpotId}_photoMeta`);
      }
      const locSearch = `?spotId=${currentSpotId}${returnTo ? `&returnTo=${returnTo}` : ''}`;
      setLocation(`/record/${tripId}/spot/loc${locSearch}`);
    },
    onError: (error: any) => {
      setUploadStatus('error');
      toast({
        title: "エラー",
        description: error.message || "写真のアップロードに失敗しました",
        variant: "destructive",
      });
    },
  });

  // EXIF GPS座標を10進数に変換
  const parseGPSCoordinate = (coordArray: any, ref: string): number => {
    try {
      if (!Array.isArray(coordArray) || coordArray.length !== 3) return NaN;
      const degrees = Array.isArray(coordArray[0]) ? coordArray[0][0] / (coordArray[0][1] || 1) : coordArray[0];
      const minutes = Array.isArray(coordArray[1]) ? coordArray[1][0] / (coordArray[1][1] || 1) : coordArray[1];
      const seconds = Array.isArray(coordArray[2]) ? coordArray[2][0] / (coordArray[2][1] || 1) : coordArray[2];
      let decimal = degrees + (minutes / 60) + (seconds / 3600);
      if (ref === 'S' || ref === 'W') decimal = -decimal;
      return decimal;
    } catch (e) {
      return NaN;
    }
  };

  const processFiles = async (files: File[]): Promise<PhotoWithMeta[]> => {
    const results: PhotoWithMeta[] = [];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const photoData: PhotoWithMeta = { file, url };
      try {
        const tags = await ExifReader.load(file);
        if (tags.GPSLatitude && tags.GPSLongitude && tags.GPSLatitudeRef && tags.GPSLongitudeRef) {
          const latArray = tags.GPSLatitude.value;
          const lngArray = tags.GPSLongitude.value;
          const latRefValue = tags.GPSLatitudeRef.value;
          const lngRefValue = tags.GPSLongitudeRef.value;
          let latRef = 'N';
          if (typeof latRefValue === 'string') latRef = latRefValue;
          else if (Array.isArray(latRefValue) && latRefValue.length > 0) latRef = String(latRefValue[0]);
          let lngRef = 'E';
          if (typeof lngRefValue === 'string') lngRef = lngRefValue;
          else if (Array.isArray(lngRefValue) && lngRefValue.length > 0) lngRef = String(lngRefValue[0]);
          const latNum = parseGPSCoordinate(latArray, latRef);
          const lngNum = parseGPSCoordinate(lngArray, lngRef);
          if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
            photoData.lat = latNum;
            photoData.lng = lngNum;
          }
        }
      } catch (e) {
        // EXIFなし - 続行
      }
      results.push(photoData);
    }
    return results;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setExifStatus('parsing');
    const newPhotos = await processFiles(files);
    // 既存の写真に追加（上書きしない）
    setPhotos(prev => [...prev, ...newPhotos]);
    const hasGps = newPhotos.some(p => p.lat && p.lng);
    setExifStatus(hasGps ? 'done' : 'none');
    // inputをリセット（同じファイルを再選択できるように）
    event.target.value = '';
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
    // 削除後にアップロード済みの場合はリセット
    if (uploadStatus === 'done') {
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      toast({ title: "写真を選択してください", variant: "destructive" });
      return;
    }
    setUploadStatus('uploading');
    // 削除されずに残っている全ての写真をアップロード
    await uploadPhotosMutation.mutateAsync(photos.map(p => p.file));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader
        title="写真を選択"
        showBack
        backPath={`/record/${tripId}`}
      />

      <main className="flex-1 px-4 py-6">
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* スポット登録であることを明示 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-primary">スポットの写真を登録</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Camera className="h-4 w-4" />
              <span>まず写真を追加しましょう。位置はあとで決めます。</span>
            </div>
            <p className="text-xs text-muted-foreground">
              1〜3枚推奨。撮影直後でも投稿できます。後から追加・削除もできます。
            </p>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {photos.length === 0 ? (
            <div className="space-y-3">
              <Button
                size="lg"
                variant="outline"
                className="w-full h-24"
                onClick={() => cameraInputRef.current?.click()}
                data-testid="button-camera"
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-6 w-6" />
                  <span className="text-sm">カメラで撮影</span>
                </div>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full h-24"
                onClick={() => libraryInputRef.current?.click()}
                data-testid="button-library"
              >
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-sm">ライブラリから選択</span>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 写真グリッド（削除ボタン付き） */}
              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden border bg-muted aspect-square">
                    <img
                      src={photo.url}
                      alt={`写真 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* 削除ボタン */}
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(index)}
                      className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                      data-testid={`button-delete-photo-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {/* 位置情報バッジ */}
                    {photo.lat && photo.lng && (
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-white text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>GPS</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 写真追加ボタン */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => cameraInputRef.current?.click()}
                  data-testid="button-add-camera"
                >
                  カメラで追加
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => libraryInputRef.current?.click()}
                  data-testid="button-add-library"
                >
                  ライブラリから追加
                </Button>
              </div>

              {uploadStatus === 'idle' && (
                <>
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleUpload}
                    data-testid="button-upload-photos"
                  >
                    <Upload className="h-5 w-5" />
                    {photos.length}枚の写真をアップロード
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setLocation(`/record/${tripId}`)}
                    data-testid="button-save-exit"
                  >
                    保存して終了
                  </Button>
                </>
              )}

              {uploadStatus === 'uploading' && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <LoadingSpinner />
                  <span className="text-sm text-muted-foreground">アップロード中...</span>
                </div>
              )}

              {uploadStatus === 'error' && (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleUpload}
                >
                  再試行
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
