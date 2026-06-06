import { Check } from "lucide-react";

export type PlannerStep = 1 | 2 | 3 | 4 | 5;

interface Props {
  step: PlannerStep;
  cityIndex?: number;   // 0-based
  totalCities?: number;
}

const STEPS = [
  { label: "基本設定" },
  { label: "スポット" },
  { label: "都市情報" },
  { label: "日程" },
  { label: "しおり" },
] as const;

export function PlannerProgress({ step, cityIndex = 0, totalCities = 1 }: Props) {
  return (
    <div className="flex items-center px-4 py-2.5 bg-white border-b border-[#EDE9FE]">
      {STEPS.map((s, i) => {
        const sNum = (i + 1) as PlannerStep;
        const done = step > sNum;
        const active = step === sNum;
        const isMultiCity = totalCities > 1 && (sNum === 2 || sNum === 3);
        return (
          <div key={sNum} className="flex items-center flex-1 min-w-0">
            {/* 左のライン（最初以外） */}
            {i > 0 && (
              <div className={`flex-1 h-px ${done || active ? "bg-[#3C237D]" : "bg-gray-200"}`} />
            )}
            {/* ステップ円 */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                done
                  ? "bg-[#3C237D] text-white"
                  : active
                    ? "bg-[#3C237D] text-white ring-2 ring-[#3C237D]/25"
                    : "bg-gray-100 text-gray-400"
              }`}>
                {done ? <Check className="w-2.5 h-2.5" /> : sNum}
              </div>
              <p className={`text-[8px] mt-0.5 leading-none font-medium ${active ? "text-[#3C237D]" : done ? "text-[#3C237D]/60" : "text-gray-300"}`}>
                {s.label}
              </p>
              {active && isMultiCity && (
                <p className="text-[7px] text-[#3C237D]/70 leading-none mt-0.5">
                  {cityIndex + 1}/{totalCities}
                </p>
              )}
            </div>
            {/* 右のライン（最後以外） */}
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${done ? "bg-[#3C237D]" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
