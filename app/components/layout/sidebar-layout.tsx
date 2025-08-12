import { ReactNode, useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Menu, X } from "lucide-react";

interface SidebarLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarWidth?: "sm" | "md" | "lg";
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export function SidebarLayout({
  sidebar,
  children,
  sidebarWidth = "md",
  collapsible = true,
  defaultCollapsed = false,
  className
}: SidebarLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarWidths = {
    sm: "w-64",
    md: "w-72", 
    lg: "w-80"
  };

  const collapsedWidth = "w-16";

  return (
    <div className={cn("flex h-screen bg-gray-50", className)}>
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 lg:relative lg:translate-x-0",
        // Mobile
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop
        "lg:flex",
        isCollapsed && collapsible ? collapsedWidth : sidebarWidths[sidebarWidth]
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {(!isCollapsed || !collapsible) && (
            <div className="flex-1">
              {/* Logo or title can go here */}
            </div>
          )}
          
          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Desktop Collapse Button */}
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          {sidebar}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

interface SidebarSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div className={cn("p-4", className)}>
      {title && (
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

interface SidebarNavProps {
  items: Array<{
    label: string;
    href: string;
    icon?: ReactNode;
    active?: boolean;
    badge?: string | number;
  }>;
  className?: string;
}

export function SidebarNav({ items, className }: SidebarNavProps) {
  return (
    <nav className={cn("space-y-1", className)}>
      {items.map((item, index) => (
        <a
          key={index}
          href={item.href}
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
            item.active
              ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          {item.icon && (
            <span className="mr-3 flex-shrink-0">
              {item.icon}
            </span>
          )}
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="ml-auto bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
              {item.badge}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}