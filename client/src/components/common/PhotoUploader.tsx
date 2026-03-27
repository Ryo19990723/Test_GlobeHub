import { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
  className?: string;
}

export function PhotoUploader({
  photos,
  onPhotosChange,
  maxPhotos = 20,
  className,
}: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const validFiles = Array.from(files).filter((file) => {
        const isValid = file.type.startsWith("image/");
        const isUnderSize = file.size <= 5 * 1024 * 1024; // 5MB
        return isValid && isUnderSize;
      });

      const newPhotos = [...photos, ...validFiles].slice(0, maxPhotos);
      onPhotosChange(newPhotos);
    },
    [photos, onPhotosChange, maxPhotos]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removePhoto = useCallback(
    (index: number) => {
      const newPhotos = photos.filter((_, i) => i !== index);
      onPhotosChange(newPhotos);
    },
    [photos, onPhotosChange]
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-all py-12",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50 hover:bg-accent/30"
        )}
        data-testid="dropzone-photos"
      >
        <label
          htmlFor="photo-upload"
          className="flex cursor-pointer flex-col items-center justify-center gap-3"
        >
          <div className="flex items-center justify-center rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              クリックまたはドラッグ&ドロップで写真を追加
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, WEBP (最大 5MB / {maxPhotos}枚まで)
            </p>
          </div>
          <input
            id="photo-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            data-testid="input-photo-upload"
          />
        </label>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-card"
              data-testid={`photo-preview-${index}`}
            >
              <img
                src={URL.createObjectURL(photo)}
                alt={`Preview ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => removePhoto(index)}
                data-testid={`button-remove-photo-${index}`}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white">
                <ImageIcon className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
