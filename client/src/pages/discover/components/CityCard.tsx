
import { Link } from "wouter";
import { Card } from "@/components/ui/card";

interface CityCardProps {
  id: string;
  name: string;
  country: string;
  tagline: string;
  tripCount: number;
  heroUrl: string;
}

export function CityCard({
  id,
  name,
  country,
  tagline,
  tripCount,
  heroUrl,
}: CityCardProps) {
  return (
    <Link href={`/discover/${id}`}>
      <Card className="relative aspect-square overflow-hidden rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-shadow flex-shrink-0 w-64">
        <img
          src={heroUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="text-lg font-bold mb-1">
            {name}・{country}
          </h3>
          <p className="text-sm opacity-90 mb-2">{tagline}</p>
          <p className="text-xs opacity-75">{tripCount}件の旅</p>
        </div>
      </Card>
    </Link>
  );
}
