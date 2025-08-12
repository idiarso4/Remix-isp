import { ReactNode } from "react";
import { cn } from "~/lib/utils";

interface DataGridProps {
  children: ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
}

export function DataGrid({ 
  children, 
  columns = 1, 
  gap = 6, 
  className 
}: DataGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
  };

  const gapClass = `gap-${gap}`;

  return (
    <div className={cn(
      "grid",
      gridCols[columns as keyof typeof gridCols] || gridCols[1],
      gapClass,
      className
    )}>
      {children}
    </div>
  );
}

interface DataCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function DataCard({ 
  title, 
  children, 
  className,
  padding = true 
}: DataCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-lg border shadow-sm",
      className
    )}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className={cn(padding && "p-6")}>
        {children}
      </div>
    </div>
  );
}