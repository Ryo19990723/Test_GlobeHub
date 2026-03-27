import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface AvatarCropperProps {
  open: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCropComplete: (croppedBlob: Blob) => void;
  isUploading?: boolean;
}

interface CropPosition {
  x: number;
  y: number;
  scale: number;
}

export function AvatarCropper({
  open,
  onClose,
  imageFile,
  onCropComplete,
  isUploading = false,
}: AvatarCropperProps) {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState<CropPosition>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const CROP_SIZE = 200;

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setCrop({ x: 0, y: 0, scale: 1 });
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    imageRef.current = img;
    
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const initialScale = CROP_SIZE / minDim;
    setCrop({ x: 0, y: 0, scale: Math.max(initialScale, 0.1) });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - crop.x, y: touch.clientY - crop.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setCrop(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  }, [isDragging, dragStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setCrop(prev => ({
      ...prev,
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    }));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCrop(prev => ({ ...prev, scale: parseFloat(e.target.value) }));
  };

  const cropImage = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const img = imageRef.current;
    const scaledWidth = img.naturalWidth * crop.scale;
    const scaledHeight = img.naturalHeight * crop.scale;
    
    const containerCenterX = CROP_SIZE / 2;
    const containerCenterY = CROP_SIZE / 2;
    
    const imgCenterX = crop.x + scaledWidth / 2;
    const imgCenterY = crop.y + scaledHeight / 2;
    
    const cropCenterX = containerCenterX - imgCenterX;
    const cropCenterY = containerCenterY - imgCenterY;

    const sourceX = (cropCenterX / crop.scale);
    const sourceY = (cropCenterY / crop.scale);
    const sourceSize = CROP_SIZE / crop.scale;

    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
      }
    }, 'image/jpeg', 0.9);
  }, [crop, onCropComplete]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>写真を調整</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          <div
            ref={containerRef}
            className="relative overflow-hidden bg-gray-900"
            style={{
              width: CROP_SIZE,
              height: CROP_SIZE,
              borderRadius: '50%',
            }}
          >
            {imageSrc && (
              <img
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="absolute cursor-move select-none"
                draggable={false}
                style={{
                  width: imageSize.width * crop.scale,
                  height: imageSize.height * crop.scale,
                  left: crop.x,
                  top: crop.y,
                  touchAction: 'none',
                }}
              />
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: '50%',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              }}
            />
          </div>

          <div className="w-full px-4">
            <label className="text-sm text-muted-foreground mb-2 block">
              ズーム
            </label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.01"
              value={crop.scale}
              onChange={handleScaleChange}
              className="w-full accent-[#7C3AED]"
              data-testid="slider-zoom"
            />
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
            data-testid="button-cancel-crop"
          >
            キャンセル
          </Button>
          <Button
            onClick={cropImage}
            disabled={isUploading}
            className="bg-[#7C3AED] hover:bg-[#6D28D9]"
            data-testid="button-confirm-crop"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                アップロード中...
              </>
            ) : (
              "この範囲で決定"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
