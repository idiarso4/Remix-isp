import { ReactNode } from "react";
import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Plus, Download, Upload, RefreshCw } from "lucide-react";

interface QuickAction {
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action, index) => (
        <div key={index}>
          {action.href ? (
            <Link to={action.href}>
              <Button
                variant={action.variant || "default"}
                disabled={action.disabled}
                className="flex items-center"
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button
              variant={action.variant || "default"}
              onClick={action.onClick}
              disabled={action.disabled}
              className="flex items-center"
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// Predefined common quick actions
export function CreateAction({ 
  href, 
  label = "Tambah Baru",
  variant = "default" 
}: { 
  href: string; 
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  return (
    <Link to={href}>
      <Button variant={variant} className="flex items-center">
        <Plus className="h-4 w-4 mr-2" />
        {label}
      </Button>
    </Link>
  );
}

export function ImportExportActions({
  onImport,
  onExport,
  onRefresh,
  importLabel = "Import",
  exportLabel = "Export",
  refreshLabel = "Refresh"
}: {
  onImport?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  importLabel?: string;
  exportLabel?: string;
  refreshLabel?: string;
}) {
  const actions: QuickAction[] = [];

  if (onImport) {
    actions.push({
      label: importLabel,
      icon: <Upload className="h-4 w-4" />,
      onClick: onImport,
      variant: "outline"
    });
  }

  if (onExport) {
    actions.push({
      label: exportLabel,
      icon: <Download className="h-4 w-4" />,
      onClick: onExport,
      variant: "outline"
    });
  }

  if (onRefresh) {
    actions.push({
      label: refreshLabel,
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: onRefresh,
      variant: "ghost"
    });
  }

  return <QuickActions actions={actions} />;
}