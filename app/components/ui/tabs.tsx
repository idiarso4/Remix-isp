import * as React from "react"
import { cn } from "~/lib/utils"

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

const Tabs = ({ value, onValueChange, children, className }: TabsProps) => (
  <div className={cn("w-full", className)} data-value={value}>
    {React.Children.map(children, child => 
      React.isValidElement(child) 
        ? React.cloneElement(child, { value, onValueChange } as any)
        : child
    )}
  </div>
);

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const TabsList = ({ children, className, value, onValueChange }: TabsListProps) => (
  <div
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500",
      className
    )}
  >
    {React.Children.map(children, child => 
      React.isValidElement(child) 
        ? React.cloneElement(child, { value, onValueChange } as any)
        : child
    )}
  </div>
);

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const TabsTrigger = ({ value: triggerValue, children, className, value, onValueChange }: TabsTriggerProps) => {
  const isActive = value === triggerValue;
  
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? "bg-white text-gray-900 shadow-sm" 
          : "text-gray-600 hover:text-gray-900",
        className
      )}
      onClick={() => onValueChange?.(triggerValue)}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  value?: string;
}

const TabsContent = ({ value: contentValue, children, className, value }: TabsContentProps) => {
  if (value !== contentValue) return null;
  
  return (
    <div
      className={cn(
        "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent }