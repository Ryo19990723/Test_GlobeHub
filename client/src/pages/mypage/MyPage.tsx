import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Settings,
  MapPin,
  LogOut,
  ChevronRight,
  FileText,
  Camera,
} from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface ProfileData {
  user: {
    id: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    instagramUrl: string | null;
    xUrl: string | null;
    isRegistered: boolean;
    tripCount: number;
  };
  cities: string[];
  trips: {
    id: string;
    title: string;
    city: string | null;
    country: string | null;
    status: "DRAFT" | "PUBLISHED";
    startDate: string | null;
    endDate: string | null;
    heroUrl: string | null;
    updatedAt: string;
    spotPhotoUrl: string | null;
  }[];
}

function TripCard({ trip }: { trip: ProfileData["trips"][0] }) {
  const imageUrl = trip.heroUrl || trip.spotPhotoUrl;
  const dateRange =
    trip.startDate && trip.endDate
      ? `${format(new Date(trip.startDate), "M/d", { locale: ja })} - ${format(new Date(trip.endDate), "M/d", { locale: ja })}`
      : null;

  return (
    <Link href={`/trips/${trip.id}`}>
      <Card className="overflow-hidden cursor-pointer hover-elevate" data-testid={`card-trip-${trip.id}`}>
        <div className="flex">
          <div className="w-24 h-24 flex-shrink-0 bg-gray-100">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={trip.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="h-8 w-8 text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-sm truncate">{trip.title}</h3>
              <Badge
                variant={trip.status === "PUBLISHED" ? "default" : "secondary"}
                className="text-xs flex-shrink-0"
              >
                {trip.status === "PUBLISHED" ? "公開中" : "下書き"}
              </Badge>
            </div>
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
    </Link>
  );
}

function GuestView() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between h-14 px-4 border-b">
        <h1 className="text-lg font-semibold">マイページ</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <FileText className="h-10 w-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">ログインが必要です</h2>
        <p className="text-muted-foreground text-center mb-6">
          マイページを利用するには
          <br />
          ログインまたは新規登録が必要です
        </p>

        <div className="w-full space-y-3 max-w-xs">
          <Link href="/mypage/login">
            <Button
              className="w-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9]"
              data-testid="button-login"
            >
              ログイン
            </Button>
          </Link>
          <Link href="/mypage/register">
            <Button variant="outline" className="w-full h-12" data-testid="button-register">
              新規登録
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function MyPage() {
  const [, setLocation] = useLocation();
  const { user, isLoggedIn, logout, isLoading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ["/api/me"],
    enabled: isLoggedIn,
  });

  if (authLoading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  if (!isLoggedIn) {
    return <GuestView />;
  }

  if (profileLoading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const displayName = profile?.user.displayName || "ユーザー";
  const avatarUrl = profile?.user.avatarUrl;
  const bio = profile?.user.bio;
  const instagramUrl = profile?.user.instagramUrl;
  const xUrl = profile?.user.xUrl;
  const cities = profile?.cities || [];
  const trips = profile?.trips || [];
  const tripCount = profile?.user.tripCount || 0;

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="flex items-center justify-between h-14 px-4 border-b">
        <h1 className="text-lg font-semibold">マイページ</h1>
        <Link href="/mypage/edit">
          <Button variant="ghost" size="icon" data-testid="button-edit-profile">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
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
            <p className="text-sm text-muted-foreground">
              旅記録: {tripCount}件
            </p>
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
                data-testid="link-instagram"
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
                data-testid="link-x"
              >
                <FaXTwitter className="w-5 h-5 text-white" />
              </a>
            )}
          </div>
        )}

        {cities.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              行った都市
            </h3>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <Badge
                  key={city}
                  variant="secondary"
                  className="text-sm"
                  data-testid={`badge-city-${city}`}
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  {city}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">旅記録</h3>
            <Link href="/record">
              <Button variant="ghost" size="sm" className="text-[#7C3AED]">
                新規作成
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          {trips.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">
                まだ旅記録がありません
              </p>
              <Link href="/record">
                <Button
                  className="mt-4 bg-[#7C3AED] hover:bg-[#6D28D9]"
                  data-testid="button-create-trip"
                >
                  旅を記録する
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 mt-6"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          ログアウト
        </Button>
      </main>
    </div>
  );
}
