import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SaveButtonProps {
  isSaved: boolean;
  onToggle: () => void;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function SaveButton({
  isSaved,
  onToggle,
  className,
  size = "default",
}: SaveButtonProps) {
  return (
    <Button
      variant={isSaved ? "default" : "outline"}
      size={size}
      onClick={onToggle}
      className={cn("gap-2", className)}
      data-testid="button-save"
    >
      <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
      <span>{isSaved ? "保存済み" : "保存"}</span>
    </Button>
  );
}
