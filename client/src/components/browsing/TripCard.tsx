import { Link } from "wouter";
import { MapPin, Heart, Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TripCardProps {
  id: string;
  title: string;
  city: string | null;
  country: string | null;
  thumbnailUrl: string | null;
  spotCount: number;
  likeCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  className?: string;
}

export function TripCard({
  id,
  title,
  city,
  country,
  thumbnailUrl,
  spotCount,
  likeCount,
  isLiked,
  isSaved,
  className,
}: TripCardProps) {
  const location = [city, country].filter(Boolean).join(", ");

  return (
    <Link href={`/trips/${id}`} data-testid={`link-trip-${id}`}>
      <Card
        className={cn(
          "group overflow-hidden hover-elevate active-elevate-2 transition-all cursor-pointer",
          className
        )}
        data-testid={`card-trip-${id}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <MapPin className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          
          <div className="absolute bottom-2 right-2 flex gap-1">
            {isLiked && (
              <Badge variant="secondary" className="gap-1 bg-black/60 text-white backdrop-blur-sm border-0">
                <Heart className="h-3 w-3 fill-current" />
              </Badge>
            )}
            {isSaved && (
              <Badge variant="secondary" className="gap-1 bg-black/60 text-white backdrop-blur-sm border-0">
                <Bookmark className="h-3 w-3 fill-current" />
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4 space-y-2">
          <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{location || "未設定"}</span>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{spotCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                <span>{likeCount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
