import * as React from "react"
import { Button } from "./button"
import { Filter } from "lucide-react"

interface FilterButtonProps {
  count?: number;
  onClick?: () => void;
}

export const FilterButton = React.forwardRef<HTMLButtonElement, FilterButtonProps>(
  ({ count, onClick }, ref) => {
    return (
      <Button ref={ref} variant="outline" className="relative" onClick={onClick}>
        <Filter className="h-4 w-4 mr-2" />
        Filter
        {count && count > 0 && (
          <span className="ml-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {count}
          </span>
        )}
      </Button>
    );
  }
)
FilterButton.displayName = "FilterButton";
