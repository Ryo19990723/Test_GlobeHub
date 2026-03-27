import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onToggle: () => void;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function LikeButton({
  isLiked,
  likeCount,
  onToggle,
  className,
  size = "default",
}: LikeButtonProps) {
  return (
    <Button
      variant={isLiked ? "default" : "outline"}
      size={size}
      onClick={onToggle}
      className={cn("gap-2", className)}
      data-testid="button-like"
    >
      <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
      <span>{likeCount}</span>
    </Button>
  );
}
