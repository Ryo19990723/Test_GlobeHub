import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface FilterPanelProps {
  filters: {
    city?: string;
    category?: string;
    purpose?: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilter: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function FilterPanel({
  filters,
  onFilterChange,
  onClearFilter,
  onClearAll,
  className,
}: FilterPanelProps) {
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">フィルタ</h3>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            data-testid="button-clear-all-filters"
          >
            全てクリア
          </Button>
        )}
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.city && (
            <Badge variant="secondary" className="gap-1">
              {filters.city}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onClearFilter("city")}
              />
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              {filters.category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onClearFilter("category")}
              />
            </Badge>
          )}
          {filters.purpose && (
            <Badge variant="secondary" className="gap-1">
              {filters.purpose}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onClearFilter("purpose")}
              />
            </Badge>
          )}
        </div>
      )}

      <Accordion type="multiple" defaultValue={["city", "category", "purpose"]}>
        <AccordionItem value="city">
          <AccordionTrigger className="text-sm font-medium">
            都市
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="都市名を入力..."
                value={filters.city || ""}
                onChange={(e) => onFilterChange("city", e.target.value)}
                data-testid="input-filter-city"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="category">
          <AccordionTrigger className="text-sm font-medium">
            カテゴリ
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="カテゴリを入力..."
                value={filters.category || ""}
                onChange={(e) => onFilterChange("category", e.target.value)}
                data-testid="input-filter-category"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="purpose">
          <AccordionTrigger className="text-sm font-medium">
            目的
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="目的を入力..."
                value={filters.purpose || ""}
                onChange={(e) => onFilterChange("purpose", e.target.value)}
                data-testid="input-filter-purpose"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
