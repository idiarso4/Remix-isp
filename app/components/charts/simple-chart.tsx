import { ReactNode } from "react";
import { cn } from "~/lib/utils";

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ChartContainer({ 
  title, 
  description, 
  children, 
  className 
}: ChartContainerProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow-sm border p-6", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

interface SimpleBarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  maxValue?: number;
  height?: number;
  className?: string;
}

export function SimpleBarChart({ 
  data, 
  maxValue, 
  height = 200, 
  className 
}: SimpleBarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value));
  
  return (
    <div className={cn("space-y-4", className)}>
      <div 
        className="flex items-end space-x-2 px-4"
        style={{ height: `${height}px` }}
      >
        {data.map((item, index) => {
          const barHeight = (item.value / max) * (height - 40);
          const color = item.color || `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
          
          return (
            <div key={item.label} className="flex-1 flex flex-col items-center">
              <div className="text-xs text-gray-600 mb-2">
                {item.value}
              </div>
              <div
                className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
                style={{
                  height: `${barHeight}px`,
                  backgroundColor: color,
                  minHeight: '4px'
                }}
              />
              <div className="text-xs text-gray-700 mt-2 text-center">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SimpleLineChartProps {
  data: Array<{
    label: string;
    value: number;
  }>;
  height?: number;
  color?: string;
  className?: string;
}

export function SimpleLineChart({ 
  data, 
  height = 200, 
  color = "#3b82f6", 
  className 
}: SimpleLineChartProps) {
  if (data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item.value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <svg
          width="100%"
          height={height}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="border rounded"
        >
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
            vectorEffect="non-scaling-stroke"
          />
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((item.value - minValue) / range) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1"
                fill={color}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>
      
      <div className="flex justify-between text-xs text-gray-600">
        {data.map((item, index) => (
          <div key={index} className="text-center">
            <div className="font-medium">{item.value}</div>
            <div>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon?: ReactNode;
  color?: string;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  color = "blue", 
  className 
}: MetricCardProps) {
  const colorClasses = {
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    orange: "from-orange-500 to-red-500",
    purple: "from-purple-500 to-pink-500",
    gray: "from-gray-500 to-gray-600"
  };

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border p-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              <span className={cn(
                "text-sm font-medium",
                change.type === 'increase' ? "text-green-600" : "text-red-600"
              )}>
                {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
              </span>
              <span className="text-sm text-gray-500 ml-2">
                {change.period}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            "p-3 rounded-xl bg-gradient-to-r",
            colorClasses[color as keyof typeof colorClasses]
          )}>
            <div className="text-white">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}