import { cn } from "@/lib/utils";

interface MobileFrameProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileFrame({ children, className }: MobileFrameProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div
        className={cn(
          "w-full max-w-[420px] min-h-screen bg-white relative shadow-lg",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
