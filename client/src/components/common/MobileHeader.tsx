import { ArrowLeft, MoreVertical } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  backPath?: string;
  action?: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    testId?: string;
  };
  className?: string;
}

export function MobileHeader({
  title,
  showBack = false,
  backPath,
  action,
  className,
}: MobileHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (backPath) {
      setLocation(backPath);
    } else {
      window.history.back();
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b",
        className
      )}
      data-testid="mobile-header"
    >
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2 flex-1">
          {showBack && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {title && (
            <h1 className="text-lg font-semibold truncate" data-testid="header-title">
              {title}
            </h1>
          )}
        </div>

        {action && (
          <Button
            size="icon"
            variant="ghost"
            onClick={action.onClick}
            data-testid={action.testId || "button-header-action"}
          >
            <action.icon className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
