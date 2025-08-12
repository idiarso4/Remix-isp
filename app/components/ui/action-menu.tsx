import { ReactNode } from "react";
import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, Download, Share } from "lucide-react";
import { cn } from "~/lib/utils";

interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
  className?: string;
}

export function ActionMenu({ items, label = "Aksi", className }: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn("h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground", className)}>
        <span className="sr-only">{label}</span>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item, index) => (
          <DropdownMenuItem
            key={index}
            disabled={item.disabled}
            className={cn(
              item.variant === 'destructive' && "text-red-600 focus:text-red-600"
            )}
          >
            {item.href ? (
              <Link to={item.href} className="flex items-center w-full">
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </Link>
            ) : (
              <button
                onClick={item.onClick}
                className="flex items-center w-full text-left"
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </button>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Predefined common action menus
export function ViewEditDeleteMenu({ 
  viewHref, 
  editHref, 
  onDelete,
  canEdit = true,
  canDelete = true 
}: {
  viewHref?: string;
  editHref?: string;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const items: ActionMenuItem[] = [];

  if (viewHref) {
    items.push({
      label: "Lihat Detail",
      icon: <Eye className="h-4 w-4" />,
      href: viewHref
    });
  }

  if (editHref && canEdit) {
    items.push({
      label: "Edit",
      icon: <Edit className="h-4 w-4" />,
      href: editHref
    });
  }

  if (onDelete && canDelete) {
    items.push({
      label: "Hapus",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: 'destructive'
    });
  }

  return <ActionMenu items={items} />;
}

export function ExportShareMenu({
  onExport,
  onShare,
  exportFormats = ['pdf', 'excel']
}: {
  onExport?: (format: string) => void;
  onShare?: () => void;
  exportFormats?: string[];
}) {
  const items: ActionMenuItem[] = [];

  if (onExport) {
    exportFormats.forEach(format => {
      items.push({
        label: `Export ${format.toUpperCase()}`,
        icon: <Download className="h-4 w-4" />,
        onClick: () => onExport(format)
      });
    });
  }

  if (onShare) {
    items.push({
      label: "Bagikan",
      icon: <Share className="h-4 w-4" />,
      onClick: onShare
    });
  }

  return <ActionMenu items={items} label="Export & Share" />;
}