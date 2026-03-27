import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, MapPin, Calendar, Users, X } from "lucide-react";
import { CITIES_MASTER, type CityData } from "@/data/cities";
import { useAuth } from "@/hooks/useAuth";

const PEOPLE_COUNT_OPTIONS = [
  { value: "1", label: "1人" },
  { value: "2", label: "2人" },
  { value: "3-4", label: "3–4人" },
  { value: "5+", label: "5人以上" },
];

const COMPANY_TYPE_OPTIONS = [
  { value: "solo", label: "ひとり" },
  { value: "friend", label: "友人" },
  { value: "couple", label: "カップル" },
  { value: "family", label: "家族" },
  { value: "group", label: "団体" },
];

export default function TripBasic() {
  const [, navigate] = useLocation();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate("/mypage/login?redirect=/record");
    }
  }, [authLoading, isLoggedIn, navigate]);

  const [title, setTitle] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [peopleCount, setPeopleCount] = useState<string>("");
  const [companyType, setCompanyType] = useState<string>("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return [];
    const query = citySearch.toLowerCase();
    return CITIES_MASTER.filter((c) => {
      const searchFields = [
        c.cityJp,
        c.cityEn,
        c.aliases
      ].join(' ').toLowerCase();
      return searchFields.includes(query);
    }).slice(0, 20);
  }, [citySearch]);

  const createTripMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trips", {
        title,
        city: selectedCity?.cityJp,
        country: selectedCity?.countryJp,
        startDate: startDate || null,
        endDate: endDate || null,
        peopleCount: peopleCount || null,
        companyType: companyType || null,
      });
      return response;
    },
    onSuccess: async (trip: any) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      const spotRes = await apiRequest("POST", `/api/trips/${trip.id}/spots`, { name: "" });
      navigate(`/record/${trip.id}/spot/photo?spotId=${spotRes.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedCity) return;
    createTripMutation.mutate();
  };

  const isValid = title.trim() && selectedCity;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="旅の基本情報" showBack backPath="/record" />
      
      <form onSubmit={handleSubmit} className="p-4 space-y-6 pb-24">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">あとから変更できます</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title" className="text-base font-medium">
            旅のタイトル <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            data-testid="input-trip-title"
            placeholder="例：夏のパリ一人旅"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-12 text-base"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            都市 <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            {selectedCity ? (
              <div className="flex items-center h-12 px-3 border border-input rounded-md bg-background">
                <span className="flex-1 text-base truncate" data-testid="text-selected-city">
                  {selectedCity.displayJp}
                </span>
                <button
                  type="button"
                  data-testid="button-clear-city"
                  onClick={() => setSelectedCity(null)}
                  className="ml-2 p-1 rounded-full hover:bg-muted"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <Input
                data-testid="input-city-search"
                placeholder="都市名を入力（例：東京、パリ）"
                value={citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value);
                  setShowCityDropdown(true);
                }}
                onFocus={() => setShowCityDropdown(true)}
                className="h-12"
              />
            )}
            {showCityDropdown && citySearch && filteredCities.length > 0 && !selectedCity && (
              <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-md mt-1 max-h-48 overflow-y-auto z-10 shadow-lg">
                {filteredCities.map((city, index) => (
                  <button
                    key={`${city.cityJp}-${city.countryJp}-${index}`}
                    type="button"
                    data-testid={`city-option-${index}`}
                    onClick={() => {
                      setSelectedCity(city);
                      setCitySearch("");
                      setShowCityDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover-elevate text-sm"
                  >
                    {city.displayJp}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            期間（任意）
          </Label>
          <p className="text-xs text-muted-foreground">どちらか一方だけでも大丈夫です</p>
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              data-testid="input-start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-12 flex-1"
            />
            <span className="text-muted-foreground">〜</span>
            <Input
              type="date"
              data-testid="input-end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-12 flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            人数（任意）
          </Label>
          <Select value={peopleCount} onValueChange={setPeopleCount}>
            <SelectTrigger data-testid="select-people-count" className="h-12">
              <SelectValue placeholder="人数を選択" />
            </SelectTrigger>
            <SelectContent>
              {PEOPLE_COUNT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">同行タイプ（任意）</Label>
          <Select value={companyType} onValueChange={setCompanyType}>
            <SelectTrigger data-testid="select-company-type" className="h-12">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            data-testid="button-create-trip"
            disabled={!isValid || createTripMutation.isPending}
            className="w-full h-14 text-lg"
          >
            {createTripMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                作成中...
              </>
            ) : (
              "作成して次へ"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
