import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Camera, ArrowLeft } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface PublicProfileData {
  user: {
    id: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    instagramUrl: string | null;
    xUrl: string | null;
    location: string | null;
    tripCount: number;
  };
  cities: string[];
  trips: {
    id: string;
    title: string;
    city: string | null;
    country: string | null;
    startDate: string | null;
    endDate: string | null;
    heroUrl: string | null;
    updatedAt: string;
    spotPhotoUrl: string | null;
  }[];
}

function TripCard({ trip }: { trip: PublicProfileData["trips"][0] }) {
  const [, setLocation] = useLocation();
  const imageUrl = trip.heroUrl || trip.spotPhotoUrl;
  const dateRange =
    trip.startDate && trip.endDate
      ? `${format(new Date(trip.startDate), "M/d", { locale: ja })} - ${format(new Date(trip.endDate), "M/d", { locale: ja })}`
      : null;

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <div
          className="w-24 h-24 flex-shrink-0 bg-gray-100 cursor-pointer"
          onClick={() => setLocation(`/trips/${trip.id}`)}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={trip.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-gray-300" />
            </div>
          )}
        </div>
        <div className="flex-1 p-3 min-w-0">
          <h3
            className="font-medium text-sm truncate cursor-pointer hover:underline"
            onClick={() => setLocation(`/trips/${trip.id}`)}
          >
            {trip.title}
          </h3>
          {trip.city && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {trip.city}
            </p>
          )}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            {dateRange && <span>{dateRange}</span>}
            <span className="ml-auto">
              更新: {format(new Date(trip.updatedAt), "M/d", { locale: ja })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface UserProfileProps {
  userId: string;
}

export default function UserProfile({ userId }: UserProfileProps) {
  const [, setLocation] = useLocation();

  const { data: profile, isLoading } = useQuery<PublicProfileData>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <p className="text-muted-foreground">ユーザーが見つかりません</p>
      </div>
    );
  }

  const displayName = profile.user.displayName || "ユーザー";
  const avatarUrl = profile.user.avatarUrl;
  const bio = profile.user.bio;
  const instagramUrl = profile.user.instagramUrl;
  const xUrl = profile.user.xUrl;
  const cities = profile.cities;
  const trips = profile.trips;
  const tripCount = profile.user.tripCount;

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="flex items-center h-14 px-4 border-b sticky top-0 bg-white z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2 truncate">{displayName}</h1>
      </header>

      <main className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-xl bg-[#7C3AED] text-white">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate" data-testid="text-displayname">
              {displayName}
            </h2>
            {profile.user.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {profile.user.location}
              </p>
            )}
            <p className="text-sm text-muted-foreground">旅記録: {tripCount}件</p>
          </div>
        </div>

        {bio && (
          <p className="text-sm text-gray-700 mb-4" data-testid="text-bio">
            {bio}
          </p>
        )}

        {(instagramUrl || xUrl) && (
          <div className="flex items-center gap-3 mb-4">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center hover-elevate"
              >
                <SiInstagram className="w-5 h-5 text-white" />
              </a>
            )}
            {xUrl && (
              <a
                href={xUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-black flex items-center justify-center hover-elevate"
              >
                <FaXTwitter className="w-5 h-5 text-white" />
              </a>
            )}
          </div>
        )}

        {cities.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">行った都市</h3>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <Badge key={city} variant="secondary" className="text-sm">
                  <MapPin className="h-3 w-3 mr-1" />
                  {city}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <h3 className="font-semibold mb-3">旅記録</h3>
          {trips.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-muted-foreground">まだ公開された旅記録がありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
