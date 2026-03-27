import { Link } from "wouter";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CityCardProps {
  cityId: string;
  cityName: string;
  country?: string | null;
  imageUrl?: string | null;
  tripCount: number;
  className?: string;
}

export function CityCard({
  cityId,
  cityName,
  country,
  imageUrl,
  tripCount,
  className,
}: CityCardProps) {
  const displayName = country ? `${cityName}・${country}` : cityName;

  return (
    <Link href={`/browse/${encodeURIComponent(cityId)}`} data-testid={`link-city-${cityId}`}>
      <Card
        className={cn(
          "group overflow-hidden hover-elevate active-elevate-2 transition-all cursor-pointer",
          className
        )}
        data-testid={`card-city-${cityId}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
              <MapPin className="h-10 w-10 text-purple-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
            <h3 className="font-semibold text-sm line-clamp-1">{displayName}</h3>
            <p className="text-xs opacity-80">{tripCount}件の旅記録</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
