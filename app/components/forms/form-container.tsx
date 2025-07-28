import { ReactNode } from "react";
import { cn } from "~/lib/utils";

interface FormContainerProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function FormContainer({ 
  children, 
  className, 
  title, 
  description 
}: FormContainerProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow-sm border", className)}>
      {(title || description) && (
        <div className="px-6 py-4 border-b border-gray-200">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}