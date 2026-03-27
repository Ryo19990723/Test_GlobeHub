import { Link } from "wouter";
import { Calendar, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface DraftTripCardProps {
  id: string;
  title: string;
  spotCount: number;
  updatedAt: Date;
  className?: string;
}

export function DraftTripCard({
  id,
  title,
  spotCount,
  updatedAt,
  className,
}: DraftTripCardProps) {
  return (
    <Link href={`/record/${id}`}>
      <Card
        className={cn(
          "group overflow-hidden hover-elevate active-elevate-2 transition-all cursor-pointer",
          className
        )}
        data-testid={`card-draft-trip-${id}`}
      >
        <CardContent className="p-6 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors flex-1">
              {title || "タイトル未設定"}
            </h3>
            <Badge variant="secondary">下書き</Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{spotCount} スポット</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDistanceToNow(updatedAt, { addSuffix: true, locale: ja })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
