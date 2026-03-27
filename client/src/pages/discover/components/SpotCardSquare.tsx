
import { Card, CardContent } from "@/components/ui/card";

interface SpotCardSquareProps {
  name: string;
  category: string;
  summary: string;
  photos: string[];
}

export function SpotCardSquare({
  name,
  category,
  summary,
  photos,
}: SpotCardSquareProps) {
  const displayPhotos = photos.slice(0, 4);
  
  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm">
      <div className="grid grid-cols-2 gap-1 aspect-square">
        {displayPhotos.map((photo, idx) => (
          <div key={idx} className="relative aspect-square overflow-hidden">
            <img
              src={photo}
              alt={`${name} ${idx + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        {displayPhotos.length < 4 &&
          Array.from({ length: 4 - displayPhotos.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="aspect-square bg-muted"
            />
          ))}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground mb-2">{category}</p>
        <p className="text-sm line-clamp-2">{summary}</p>
      </CardContent>
    </Card>
  );
}
