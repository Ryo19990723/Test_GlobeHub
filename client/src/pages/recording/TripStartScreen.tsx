
import { Notebook, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TripStartScreenProps {
  onStartNewTrip: () => void;
  onSelectDraftTrip: (tripId: string) => void;
}

export default function TripStartScreen({ 
  onStartNewTrip, 
  onSelectDraftTrip 
}: TripStartScreenProps) {
  const draftTrips = [
    { id: "1", title: "Kyoto Trip", spots: 3, updated: "4月" },
    { id: "2", title: "Hokkaido Adventure", spots: 2, updated: "3月" }
  ];

  return (
    <div className="min-h-screen bg-[#F7F6FF] px-5 pb-24">
      {/* Header */}
      <header className="h-14 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#7C3AED]">GlobeHub</h1>
        <p className="text-sm text-[#111827]">
          こんにちは、<span className="font-bold">Ryo</span>
        </p>
      </header>

      {/* Title */}
      <div className="mt-6 mb-6">
        <h2 className="text-[28px] font-bold text-[#111827]">旅を始める</h2>
      </div>

      {/* Main CTA: New Trip Button */}
      <div className="mb-6">
        <Button
          onClick={onStartNewTrip}
          className="w-full h-auto bg-[#7C3AED] hover:bg-[#6C2BD9] rounded-3xl p-6 shadow-md transition-transform active:scale-[0.98] border-0"
        >
          <div className="flex items-center gap-4 w-full">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <Notebook className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <span className="text-lg font-bold text-white">新しい旅を始める</span>
          </div>
        </Button>
      </div>

      {/* Draft Trips Section */}
      <div>
        <h3 className="text-lg font-bold text-[#111827] mb-4">作成途中の旅</h3>
        <div className="space-y-3">
          {draftTrips.map((trip) => (
            <Card 
              key={trip.id}
              className="bg-white rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-shadow border-0"
              onClick={() => onSelectDraftTrip(trip.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-[#111827] mb-1">
                    {trip.title}
                  </h4>
                  <p className="text-[13px] text-[#6B7280]">
                    {trip.spots}スポット・最終更新：{trip.updated}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#6B7280] flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
