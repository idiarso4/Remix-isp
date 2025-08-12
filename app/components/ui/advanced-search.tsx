import { useState } from "react";
import { Form, useSearchParams, useSubmit } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { 
  Search, 
  Filter, 
  X,
  Calendar,
  ChevronDown
} from "lucide-react";
import { cn } from "~/lib/utils";

interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface AdvancedSearchProps {
  searchPlaceholder?: string;
  filterFields?: FilterField[];
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, string>) => void;
  className?: string;
}

export function AdvancedSearch({
  searchPlaceholder = "Cari...",
  filterFields = [],
  onSearch,
  onFilter,
  className
}: AdvancedSearchProps) {
  const [searchParams] = useSearchParams();
  const submit = useSubmit();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  const activeFilters = filterFields.filter(field => 
    searchParams.get(field.key)
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    } else {
      const formData = new FormData();
      formData.set("search", query);
      // Preserve existing filters
      searchParams.forEach((value, key) => {
        if (key !== "search") {
          formData.set(key, value);
        }
      });
      submit(formData, { method: "get" });
    }
  };

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    if (onFilter) {
      const filters: Record<string, string> = {};
      formData.forEach((value, key) => {
        if (value && key !== "search") {
          filters[key] = value.toString();
        }
      });
      onFilter(filters);
    } else {
      submit(formData, { method: "get" });
    }
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    const formData = new FormData();
    formData.set("search", searchQuery);
    submit(formData, { method: "get" });
  };

  const removeFilter = (filterKey: string) => {
    const formData = new FormData();
    formData.set("search", searchQuery);
    searchParams.forEach((value, key) => {
      if (key !== filterKey && key !== "search") {
        formData.set(key, value);
      }
    });
    submit(formData, { method: "get" });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {filterFields.length > 0 && (
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger className="relative inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {activeFilters.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
              <ChevronDown className="h-4 w-4 ml-2" />
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <Form onSubmit={handleFilterSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filter</h4>
                  {activeFilters.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                
                <input type="hidden" name="search" value={searchQuery} />
                
                {filterFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {field.type === 'select' ? (
                      <select
                        id={field.key}
                        name={field.key}
                        defaultValue={searchParams.get(field.key) || ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Semua</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'date' ? (
                      <Input
                        id={field.key}
                        name={field.key}
                        type="date"
                        defaultValue={searchParams.get(field.key) || ""}
                      />
                    ) : (
                      <Input
                        id={field.key}
                        name={field.key}
                        type="text"
                        placeholder={field.placeholder}
                        defaultValue={searchParams.get(field.key) || ""}
                      />
                    )}
                  </div>
                ))}
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFilterOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit">
                    Terapkan Filter
                  </Button>
                </div>
              </Form>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((field) => {
            const value = searchParams.get(field.key);
            const displayValue = field.type === 'select' 
              ? field.options?.find(opt => opt.value === value)?.label || value
              : value;
            
            return (
              <div
                key={field.key}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                <span className="font-medium">{field.label}:</span>
                <span className="ml-1">{displayValue}</span>
                <button
                  type="button"
                  onClick={() => removeFilter(field.key)}
                  className="ml-2 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}