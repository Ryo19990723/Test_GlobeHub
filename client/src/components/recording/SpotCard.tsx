import { MapPin, Image as ImageIcon, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SpotCardProps {
  spot: {
    id: string;
    name: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    notes: string | null;
    photos: { id: string; url: string }[];
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function SpotCard({ spot, onEdit, onDelete, className }: SpotCardProps) {
  const thumbnailUrl = spot.photos[0]?.url;
  const location = spot.address || (spot.lat && spot.lng ? `${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}` : null);

  return (
    <Card
      className={cn(
        "group overflow-hidden hover-elevate active-elevate-2 transition-all cursor-pointer",
        className
      )}
      onClick={() => onEdit(spot.id)}
      data-testid={`card-spot-${spot.id}`}
    >
      <div className="flex gap-4 p-4">
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={spot.name || "Spot"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <MapPin className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
          {spot.photos.length > 0 && (
            <Badge
              variant="secondary"
              className="absolute bottom-1 right-1 h-6 gap-1 bg-black/60 text-white backdrop-blur-sm border-0"
            >
              <ImageIcon className="h-3 w-3" />
              {spot.photos.length}
            </Badge>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold line-clamp-1">
              {spot.name || "名称未設定"}
            </h3>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(spot.id);
              }}
              data-testid={`button-delete-spot-${spot.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          {location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}

          {spot.notes && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {spot.notes}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
