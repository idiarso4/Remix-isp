import { useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Search, Filter, X } from "lucide-react";

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface SearchFilterProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClearFilters?: () => void;
  className?: string;
}

export function SearchFilter({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Cari...",
  filters = [],
  filterValues = {},
  onFilterChange,
  onClearFilters,
  className
}: SearchFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveFilters = Object.values(filterValues).some(value => value !== "");
  const activeFilterCount = Object.values(filterValues).filter(value => value !== "").length;

  return (
    <div className={cn("flex flex-col sm:flex-row gap-4", className)}>
      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Button */}
      {filters.length > 0 && (
        <div className="flex items-center gap-2">
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filter</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onClearFilters?.();
                        setIsFilterOpen(false);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Hapus Semua
                    </Button>
                  )}
                </div>

                {filters.map((filter) => (
                  <div key={filter.key} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {filter.label}
                    </Label>

                    {filter.type === 'select' && filter.options && (
                      <Select
                        value={filterValues[filter.key] || ""}
                        onValueChange={(value) => onFilterChange?.(filter.key, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={filter.placeholder || "Pilih..."} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Semua</SelectItem>
                          {filter.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {filter.type === 'text' && (
                      <Input
                        placeholder={filter.placeholder}
                        value={filterValues[filter.key] || ""}
                        onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                      />
                    )}

                    {filter.type === 'date' && (
                      <Input
                        type="date"
                        value={filterValues[filter.key] || ""}
                        onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}