import { Check } from "lucide-react";

const STEPS = ["写真", "位置", "詳細", "感想"];

interface RecordProgressProps {
  step: 1 | 2 | 3 | 4;
}

export function RecordProgress({ step }: RecordProgressProps) {
  return (
    <div className="flex items-start px-5 py-2 bg-background border-b">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const isDone = stepNum < step;
        const isActive = stepNum === step;
        return (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                isDone
                  ? "bg-primary text-white"
                  : isActive
                  ? "bg-primary/15 text-primary ring-2 ring-primary ring-offset-1"
                  : "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : stepNum}
              </div>
              <span className={`text-[10px] font-medium leading-none ${
                isActive ? "text-primary" : isDone ? "text-primary/60" : "text-muted-foreground"
              }`}>
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full mb-3.5 ${isDone ? "bg-primary/50" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
