
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { MobileHeader } from "@/components/common/MobileHeader";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { CityCard } from "./components/CityCard";
import { SectionTitle } from "./components/SectionTitle";
import { fetchCitiesBySections, type City } from "./api";

export default function Cities() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sections, setSections] = useState<{
    recent: City[];
    recommended: City[];
    campaign: City[];
  }>({ recent: [], recommended: [], campaign: [] });

  useEffect(() => {
    fetchCitiesBySections().then((data) => {
      setSections(data);
      setLoading(false);
    });
  }, []);

  const filterCities = (cities: City[]) => {
    if (!searchQuery) return cities;
    const query = searchQuery.toLowerCase();
    return cities.filter(
      (city) =>
        city.name.toLowerCase().includes(query) ||
        city.country.toLowerCase().includes(query)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader title="場所を探す" />

      <main className="flex-1 px-4 py-6 space-y-8">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="都市や国で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <section>
          <SectionTitle>最近見た場所</SectionTitle>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {filterCities(sections.recent).map((city) => (
              <CityCard key={city.id} {...city} />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>あなたへのおすすめ</SectionTitle>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {filterCities(sections.recommended).map((city) => (
              <CityCard key={city.id} {...city} />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>エミレーツ航空特集</SectionTitle>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {filterCities(sections.campaign).map((city) => (
              <CityCard key={city.id} {...city} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
