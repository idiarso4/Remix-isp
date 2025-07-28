import { ReactNode } from "react";
import { cn } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
  iconClassName?: string;
  children?: ReactNode;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
  iconClassName,
  children
}: StatsCardProps) {
  return (
    <Card className={cn(
      "bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {trend && (
              <div className="flex items-center">
                <span className={cn(
                  "text-sm font-medium",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {trend.value}
                </span>
                {description && (
                  <span className="text-sm text-gray-500 ml-1">
                    {description}
                  </span>
                )}
              </div>
            )}
            {!trend && description && (
              <p className="text-sm text-gray-500">
                {description}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "p-3 rounded-xl",
              iconClassName || "bg-gradient-to-r from-blue-500 to-purple-500"
            )}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// Predefined color variants for icons
export const iconVariants = {
  blue: "bg-gradient-to-r from-blue-500 to-cyan-500",
  green: "bg-gradient-to-r from-green-500 to-emerald-500",
  orange: "bg-gradient-to-r from-orange-500 to-red-500",
  purple: "bg-gradient-to-r from-purple-500 to-pink-500",
  gray: "bg-gradient-to-r from-gray-500 to-slate-500",
};