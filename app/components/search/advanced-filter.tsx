import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { 
  Filter, 
  X, 
  Calendar,
  Search,
  ChevronDown
} from "lucide-react";
import { cn } from "~/lib/utils";

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
}

interface AdvancedFilterProps {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
  onClear: () => void;
  className?: string;
}

export function AdvancedFilter({
  fields,
  values,
  onChange,
  onClear,
  className
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValues, setLocalValues] = useState(values);

  const activeFilters = Object.entries(values).filter(([_, value]) => value && value !== '');
  const hasActiveFilters = activeFilters.length > 0;

  const handleFieldChange = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    onChange(localValues);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setLocalValues({});
    onClear();
    setIsOpen(false);
  };

  const removeFilter = (key: string) => {
    const newValues = { ...values };
    delete newValues[key];
    onChange(newValues);
    setLocalValues(newValues);
  };

  const getFieldLabel = (key: string) => {
    const field = fields.find(f => f.key === key);
    return field?.label || key;
  };

  const getDisplayValue = (key: string, value: string) => {
    const field = fields.find(f => f.key === key);
    if (field?.type === 'select' && field.options) {
      const option = field.options.find(opt => opt.value === value);
      return option?.label || value;
    }
    return value;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter Button */}
      <div className="flex items-center space-x-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 relative">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
            {hasActiveFilters && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-500 text-white">
                {activeFilters.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-2" />
          </PopoverTrigger>
          
          <PopoverContent className="w-96" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Advanced Filters</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              
              {/* Filter Fields */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    
                    {field.type === 'text' && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id={field.key}
                          type="text"
                          placeholder={field.placeholder}
                          value={localValues[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    )}
                    
                    {field.type === 'select' && (
                      <select
                        id={field.key}
                        value={localValues[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                    
                    {field.type === 'date' && (
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id={field.key}
                          type="date"
                          value={localValues[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    )}
                    
                    {field.type === 'number' && (
                      <Input
                        id={field.key}
                        type="number"
                        placeholder={field.placeholder}
                        min={field.min}
                        max={field.max}
                        value={localValues[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      />
                    )}
                    
                    {field.type === 'daterange' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="date"
                            placeholder="From"
                            value={localValues[`${field.key}_from`] || ''}
                            onChange={(e) => handleFieldChange(`${field.key}_from`, e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="date"
                            placeholder="To"
                            value={localValues[`${field.key}_to`] || ''}
                            onChange={(e) => handleFieldChange(`${field.key}_to`, e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={applyFilters}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(([key, value]) => (
            <div
              key={key}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
            >
              <span className="font-medium">{getFieldLabel(key)}:</span>
              <span className="ml-1">{getDisplayValue(key, value)}</span>
              <button
                type="button"
                onClick={() => removeFilter(key)}
                className="ml-2 hover:text-blue-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          {activeFilters.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-red-600 hover:text-red-700 px-2 py-1 h-auto"
            >
              Clear All
            </Button>
          )}
        </div>
      )}
    </div>
  );
}