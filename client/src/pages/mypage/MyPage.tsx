import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Settings,
  MapPin,
  LogOut,
  ChevronRight,
  FileText,
  Camera,
  Pencil,
  Globe,
} from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [, setLocation] = useLocation();
  const imageUrl = trip.heroUrl || trip.spotPhotoUrl;
  const dateRange =
    trip.startDate && trip.endDate
      ? `${format(new Date(trip.startDate), "M/d", { locale: ja })} - ${format(new Date(trip.endDate), "M/d", { locale: ja })}`
      : null;

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[#EDE9FE] bg-white"
      style={{ boxShadow: "0 2px 10px hsl(257 56% 31% / 0.06)" }}
      data-testid={`card-trip-${trip.id}`}
    >
      <div className="flex">
        <div
          className="w-24 h-24 flex-shrink-0 bg-[#EDE9FE] cursor-pointer"
          onClick={() => setLocation(`/trips/${trip.id}`)}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={trip.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-[#3C237D]/30" />
            </div>
          )}
        </div>
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-semibold text-sm truncate cursor-pointer text-[#1E1B4B]"
              onClick={() => setLocation(`/trips/${trip.id}`)}
            >
              {trip.title}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  trip.status === "PUBLISHED"
                    ? "bg-[#3C237D] text-white"
                    : "bg-[#EDE9FE] text-[#3C237D]"
                }`}
              >
                {trip.status === "PUBLISHED" ? "公開中" : "下書き"}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation(`/record/${trip.id}`);
                }}
                className="p-1.5 rounded-lg hover:bg-[#EDE9FE] transition-colors"
                data-testid={`button-edit-trip-${trip.id}`}
                title="編集"
              >
                <Pencil className="h-3.5 w-3.5 text-[#3C237D]/60" />
              </button>
            </div>
          </div>
          {trip.city && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
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
    </div>
  );
}

function GuestView() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Brand header */}
      <div
        className="px-4 pt-5 pb-8 flex flex-col items-center"
        style={{
          background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)",
        }}
      >
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
          <Globe className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">GlobeHub</h1>
        <p className="text-sm text-white/70 mt-1">旅の記録をはじめよう</p>
      </div>

      <main className="flex-1 flex flex-col items-center px-6 pt-8">
        <h2 className="text-lg font-bold text-[#1E1B4B] mb-1">ログインが必要です</h2>
        <p className="text-sm text-muted-foreground text-center mb-8">
          マイページを利用するには<br />ログインまたは新規登録が必要です
        </p>

        <div className="w-full space-y-3 max-w-xs">
          <Link href="/mypage/login">
            <Button
              className="w-full h-12 rounded-xl text-white font-semibold"
              style={{
                background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)",
                boxShadow: "0 4px 14px hsl(257 56% 31% / 0.30)",
              }}
              data-testid="button-login"
            >
              ログインする
            </Button>
          </Link>
          <Link href="/mypage/register">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-[#3C237D] text-[#3C237D] font-semibold hover:bg-[#EDE9FE]"
              data-testid="button-register"
            >
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
    <div className="min-h-screen bg-white pb-24">
      {/* Profile hero header */}
      <div
        className="relative px-4 pt-5 pb-8"
        style={{
          background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 60%, #7C5CC7 100%)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-semibold text-white">マイページ</span>
          <Link href="/mypage/edit">
            <button
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
              data-testid="button-edit-profile"
            >
              <Settings className="h-5 w-5 text-white" />
            </button>
          </Link>
        </div>

        <div className="flex items-end gap-4">
          <Avatar className="w-20 h-20 border-3 border-white/40 shadow-lg">
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback
              className="text-2xl font-bold"
              style={{ background: "rgba(255,255,255,0.25)", color: "white" }}
            >
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pb-1">
            <h2 className="text-xl font-bold text-white truncate" data-testid="text-displayname">
              {displayName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                {tripCount} 件の旅
              </span>
              {cities.length > 0 && (
                <span className="text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                  {cities.length} 都市
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 pt-5">
        {bio && (
          <p className="text-sm text-gray-700 mb-4 leading-relaxed" data-testid="text-bio">
            {bio}
          </p>
        )}

        {(instagramUrl || xUrl) && (
          <div className="flex items-center gap-3 mb-5">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center active:scale-90 transition-transform"
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
                className="w-10 h-10 rounded-full bg-black flex items-center justify-center active:scale-90 transition-transform"
                data-testid="link-x"
              >
                <FaXTwitter className="w-5 h-5 text-white" />
              </a>
            )}
          </div>
        )}

        {cities.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
              行った都市
            </h3>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <span
                  key={city}
                  className="flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full bg-[#EDE9FE] text-[#3C237D]"
                  data-testid={`badge-city-${city}`}
                >
                  <MapPin className="h-3 w-3" />
                  {city}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 旅のプロファイル */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[15px] font-semibold text-[#1E1B4B]">✨ 旅のプロファイル</h3>
            <Link href="/mypage/travel-profile">
              <button className="text-xs font-medium text-[#3C237D] flex items-center gap-0.5">
                編集 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
          <div
            onClick={() => setLocation("/mypage/travel-profile")}
            className="cursor-pointer rounded-2xl border border-dashed border-[#3C237D]/30 bg-[#FAF9FF] p-3.5 text-sm text-[#3C237D]/80 leading-relaxed active:scale-[0.98] transition-transform"
          >
            AIがあなたの好みに合った旅を提案するための設定です。タップして設定・変更できます。
          </div>
        </div>

        {/* 旅記録一覧 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-[#1E1B4B]">旅記録</h3>
            <Link href="/record">
              <button className="text-xs font-medium text-[#3C237D] flex items-center gap-0.5">
                新規作成 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>

          {trips.length === 0 ? (
            <div className="text-center py-12 bg-[#FAF9FF] rounded-2xl border border-[#EDE9FE]">
              <FileText className="h-12 w-12 text-[#3C237D]/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">まだ旅記録がありません</p>
              <Link href="/record">
                <button
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #3C237D 0%, #5B3FAF 100%)" }}
                  data-testid="button-create-trip"
                >
                  旅を記録する
                </button>
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

        <button
          className="w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-xl text-red-500 font-medium text-sm border border-red-100 hover:bg-red-50 active:scale-[0.98] transition-all"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </button>
      </main>
    </div>
  );
}
