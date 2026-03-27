import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "旅記録を検索...",
  className,
}: SearchBarProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <div className="relative flex gap-2 flex-1">
        <div className="flex items-center gap-2 flex-1 border rounded-full shadow-md px-4 bg-background">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="border-0 shadow-none focus-visible:ring-0 bg-transparent"
            data-testid="input-search"
          />
          {value && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleClear}
              className="rounded-full flex-shrink-0"
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <Button
        onClick={onSearch}
        className="rounded-full shadow-md"
        data-testid="button-search"
      >
        検索
      </Button>
    </div>
  );
}
