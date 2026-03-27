
import { useState, useRef, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Upload, Image as ImageIcon } from "lucide-react";
import ExifReader from "exifreader";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PhotoWithDistance {
  file: File;
  url: string;
  distance?: number;
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PhotoWithDistance[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [exifStatus, setExifStatus] = useState<ExifStatus>('idle');
  const [photoMeta, setPhotoMeta] = useState<{ lat: number; lng: number } | null>(null);

  const { data: spot } = useQuery({
    queryKey: ["/api/spots", spotId],
    queryFn: async () => {
      const res = await fetch(`/api/spots/${spotId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Failed to fetch spot");
      return res.json();
    },
    enabled: !!spotId,
  });

  // Ensure we have a spotId before uploading photos
  const ensureSpotId = async (): Promise<string> => {
    if (spotId) return spotId;

    try {
      const res = await fetch(`/api/trips/${tripId}/spots/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to create draft spot: ${res.status}`);
      }

      const data = await res.json();
      const newSpotId = data.spotId || data.id;
      setSpotId(newSpotId);
      
      // Update URL with new spotId
      window.history.replaceState(null, '', `/record/${tripId}/spot/photo?spotId=${newSpotId}`);
      
      return newSpotId;
    } catch (error) {
      console.error("Failed to create draft spot:", error);
      throw error;
    }
  };

  const uploadPhotosMutation = useMutation({
    mutationFn: async (files: File[]) => {
      // Ensure we have a spotId before uploading
      const currentSpotId = await ensureSpotId();
      
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("photos", file);
      });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/spots", spotId] });
      setUploadStatus('done');
    },
    onError: (error: any) => {
      setUploadStatus('error');
      console.error("Upload error:", error);
      toast({
        title: "エラー",
        description: error.message || "写真のアップロードに失敗しました",
        variant: "destructive",
      });
    },
  });

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // EXIF GPS座標を10進数形式に変換する関数
  // ExifReaderは度分秒を分数の配列として返す: [[deg_num, deg_den], [min_num, min_den], [sec_num, sec_den]]
  const parseGPSCoordinate = (coordArray: any, ref: string): number => {
    try {
      if (!Array.isArray(coordArray) || coordArray.length !== 3) return NaN;
      
      // 各要素が [分子, 分母] の配列である場合の処理
      const degrees = Array.isArray(coordArray[0]) 
        ? coordArray[0][0] / (coordArray[0][1] || 1)
        : coordArray[0];
      const minutes = Array.isArray(coordArray[1])
        ? coordArray[1][0] / (coordArray[1][1] || 1)
        : coordArray[1];
      const seconds = Array.isArray(coordArray[2])
        ? coordArray[2][0] / (coordArray[2][1] || 1)
        : coordArray[2];
      
      // 10進数形式に変換
      let decimal = degrees + (minutes / 60) + (seconds / 3600);
      
      // 南緯または西経の場合は負の値にする
      if (ref === 'S' || ref === 'W') {
        decimal = -decimal;
      }
      
      return decimal;
    } catch (e) {
      console.error('GPS座標変換エラー:', e);
      return NaN;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const processedPhotos: PhotoWithDistance[] = [];
    
    // EXIF処理を有効化
    setExifStatus('parsing');
    let firstValidGPS: { lat: number; lng: number } | null = null;

    for (const file of files) {
      const url = URL.createObjectURL(file);
      const photoData: PhotoWithDistance = { file, url };

      // EXIF情報を読み取り
      try {
        const tags = await ExifReader.load(file);
        
        // GPS情報を抽出（ExifReaderは度分秒の配列を返す）
        if (tags.GPSLatitude && tags.GPSLongitude && tags.GPSLatitudeRef && tags.GPSLongitudeRef) {
          const latArray = tags.GPSLatitude.value;
          const lngArray = tags.GPSLongitude.value;
          
          // Refは文字列または文字列配列の可能性がある
          const latRefValue = tags.GPSLatitudeRef.value;
          const lngRefValue = tags.GPSLongitudeRef.value;
          
          let latRef = 'N';
          if (typeof latRefValue === 'string') {
            latRef = latRefValue;
          } else if (Array.isArray(latRefValue) && latRefValue.length > 0) {
            latRef = String(latRefValue[0]);
          }
          
          let lngRef = 'E';
          if (typeof lngRefValue === 'string') {
            lngRef = lngRefValue;
          } else if (Array.isArray(lngRefValue) && lngRefValue.length > 0) {
            lngRef = String(lngRefValue[0]);
          }
          
          const latNum = parseGPSCoordinate(latArray, latRef);
          const lngNum = parseGPSCoordinate(lngArray, lngRef);
          
          if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
            photoData.lat = latNum;
            photoData.lng = lngNum;
            
            // 最初の有効なGPS座標を保存
            if (!firstValidGPS) {
              firstValidGPS = { lat: latNum, lng: lngNum };
            }
          }
        }
      } catch (error) {
        console.log(`EXIF読み取りスキップ: ${file.name}`, error);
      }

      processedPhotos.push(photoData);
    }

    setPhotos(processedPhotos);
    
    // GPS座標が見つかった場合はphotoMetaに保存
    if (firstValidGPS) {
      setPhotoMeta(firstValidGPS);
      setExifStatus('done');
      console.log('EXIF GPS座標を検出:', firstValidGPS);
    } else {
      setPhotoMeta(null);
      setExifStatus('none');
    }
    
    // 全ての写真を自動選択
    setSelectedPhotos(new Set(processedPhotos.map((_, i) => i)));
  };

  const togglePhoto = (index: number) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPhotos(newSelected);
  };

  const handleUpload = async () => {
    const filesToUpload = photos
      .filter((_, index) => selectedPhotos.has(index))
      .map((p) => p.file);

    if (filesToUpload.length === 0) {
      toast({
        title: "写真を選択してください",
        variant: "destructive",
      });
      return;
    }

    setUploadStatus('uploading');
    await uploadPhotosMutation.mutateAsync(filesToUpload);
  };

  const handleProceedToLocation = async () => {
    if (uploadStatus !== 'done') {
      toast({
        title: "先に写真をアップロードしてください",
        variant: "destructive",
      });
      return;
    }

    // Ensure we have a spotId
    const currentSpotId = spotId || await ensureSpotId();

    // EXIF座標をsessionStorageに保存（同期処理）
    if (photoMeta) {
      sessionStorage.setItem(`spot_${currentSpotId}_photoMeta`, JSON.stringify(photoMeta));
    } else {
      sessionStorage.removeItem(`spot_${currentSpotId}_photoMeta`);
    }
    
    // 即座に位置確定画面へ遷移
    setLocation(`/record/${tripId}/spot/loc?spotId=${currentSpotId}`);
  };

  const canProceed = uploadStatus === 'done' && (exifStatus === 'done' || exifStatus === 'none');

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader
        title="写真を選択"
        showBack
        backPath={`/record/${tripId}`}
      />

      <main className="flex-1 px-4 py-6">
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="space-y-2">
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
              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all ${
                      selectedPhotos.has(index) ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => togglePhoto(index)}
                  >
                    <CardContent className="p-2">
                      <div className="w-full aspect-square bg-muted rounded flex items-center justify-center overflow-hidden">
                        <img
                          src={photo.url}
                          alt={`選択された写真 ${index + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {photo.lat && photo.lng && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          📍 位置情報あり
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

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
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleUpload}
                  disabled={selectedPhotos.size === 0}
                  data-testid="button-upload-photos"
                >
                  <Upload className="h-5 w-5" />
                  {selectedPhotos.size}枚の写真をアップロード
                </Button>
              )}

              {uploadStatus === 'uploading' && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <LoadingSpinner />
                  <span className="text-sm text-muted-foreground">アップロード中...</span>
                </div>
              )}

              {canProceed && (
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleProceedToLocation}
                  data-testid="button-proceed-location"
                >
                  位置を決める
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
