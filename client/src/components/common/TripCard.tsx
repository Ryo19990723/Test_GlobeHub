import { Link } from "wouter";
import { MapPin, Users, Calendar, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface TripCardProps {
  id: string;
  title: string;
  city: string | null;
  country: string | null;
  thumbnailUrl: string | null;
  peopleCount?: number | null;
  companyType?: string | null;
  publishedAt?: string | null;
  className?: string;
}

const COMPANY_TYPE_LABELS: Record<string, string> = {
  solo: "ひとり旅",
  couple: "カップル",
  family: "家族",
  friends: "友人",
  business: "ビジネス",
  group: "グループ",
};

export function TripCard({
  id,
  title,
  city,
  country,
  thumbnailUrl,
  peopleCount,
  companyType,
  publishedAt,
  className,
}: TripCardProps) {
  const location = [city, country].filter(Boolean).join("・");
  const companyLabel = companyType ? COMPANY_TYPE_LABELS[companyType] || companyType : null;
  const formattedDate = publishedAt 
    ? format(new Date(publishedAt), "yyyy/MM/dd", { locale: ja })
    : null;

  return (
    <Link href={`/trips/${id}`} data-testid={`link-trip-${id}`}>
      <Card
        className={cn(
          "group overflow-hidden hover-elevate active-elevate-2 transition-all cursor-pointer",
          className
        )}
        data-testid={`card-trip-${id}`}
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
              <MapPin className="h-12 w-12 text-purple-300" />
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          <h3 className="text-base font-semibold line-clamp-2 group-hover:text-[#7C3AED] transition-colors">
            {title}
          </h3>

          {location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {peopleCount && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Users className="h-3 w-3" />
                {peopleCount}人
              </Badge>
            )}
            {companyLabel && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Briefcase className="h-3 w-3" />
                {companyLabel}
              </Badge>
            )}
            {formattedDate && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Calendar className="h-3 w-3" />
                {formattedDate}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
