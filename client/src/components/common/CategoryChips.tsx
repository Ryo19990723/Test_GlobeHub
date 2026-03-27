import { cn } from "@/lib/utils";

interface Category {
  id: string;
  label: string;
}

interface CategoryChipsProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: "all", label: "すべて" },
  { id: "solo", label: "ひとり旅" },
  { id: "couple", label: "カップル" },
  { id: "friend", label: "友人" },
  { id: "family", label: "家族" },
  { id: "group", label: "グループ" },
];

export function CategoryChips({
  categories = DEFAULT_CATEGORIES,
  selected,
  onSelect,
  className,
}: CategoryChipsProps) {
  const activeId = selected || "all";

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto scrollbar-hide py-2 px-4 -mx-4",
        className
      )}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {categories.map((category) => {
        const isActive = category.id === activeId;
        return (
          <button
            key={category.id}
            onClick={() => onSelect(category.id === "all" ? null : category.id)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              isActive
                ? "bg-[#7C3AED] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
            data-testid={`chip-category-${category.id}`}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}

export { DEFAULT_CATEGORIES };
