import { Form, Link, useLocation } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "~/components/ui/badge";
import {
  Wifi,
  Users,
  Package,
  Ticket,
  UserCheck,
  BarChart3,
  LogOut,
  Settings,
  User,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import type { User as AuthUser } from "~/lib/auth.server";

interface NavigationProps {
  user: AuthUser;
}

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: BarChart3,
    resource: "dashboard",
    action: "read" as const,
  },
  {
    name: "Pelanggan",
    href: "/customers",
    icon: Users,
    resource: "customers",
    action: "read" as const,
  },
  {
    name: "Paket Internet",
    href: "/packages",
    icon: Package,
    resource: "packages",
    action: "read" as const,
  },
  {
    name: "Tiket Support",
    href: "/tickets",
    icon: Ticket,
    resource: "tickets",
    action: "read" as const,
  },
  {
    name: "Karyawan",
    href: "/employees",
    icon: UserCheck,
    resource: "employees",
    action: "read" as const,
  },
  {
    name: "Laporan",
    href: "/reports",
    icon: BarChart3,
    resource: "reports",
    action: "read" as const,
  },
];

const roleColors = {
  ADMIN: "bg-red-100 text-red-700 border-red-300",
  TECHNICIAN: "bg-blue-100 text-blue-700 border-blue-300",
  MARKETING: "bg-green-100 text-green-700 border-green-300",
  HR: "bg-purple-100 text-purple-700 border-purple-300",
};

const roleLabels = {
  ADMIN: "Admin",
  TECHNICIAN: "Teknisi",
  MARKETING: "Marketing",
  HR: "HR",
};

export function Navigation({ user }: NavigationProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Simple permission filtering based on role
  const filteredNavItems = navigationItems.filter((item) => {
    if (!user.employee) return false;

    const role = user.employee.role;

    // Admin sees everything
    if (role === 'ADMIN') return true;

    // Basic role-based filtering
    switch (item.resource) {
      case 'dashboard':
        return true; // Everyone can see dashboard
      case 'customers':
        return ['MARKETING', 'TECHNICIAN', 'HR'].includes(role);
      case 'packages':
        return ['MARKETING'].includes(role);
      case 'tickets':
        return ['TECHNICIAN', 'MARKETING'].includes(role);
      case 'employees':
        return ['HR'].includes(role);
      case 'reports':
        return ['MARKETING', 'HR', 'TECHNICIAN'].includes(role);
      default:
        return false;
    }
  });

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <Wifi className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                  ISP Management
                </h1>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Role Badge */}
            <Badge className={`hidden sm:inline-flex ${roleColors[user.employee?.role as keyof typeof roleColors] || roleColors.TECHNICIAN}`}>
              {roleLabels[user.employee?.role as keyof typeof roleLabels] || "User"}
            </Badge>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-10 w-10 rounded-full bg-transparent hover:bg-gray-100 border-0 p-0">
                <Avatar className="h-10 w-10 border-2 border-gray-200">
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
                    {getUserInitials(user.employee?.name || user.email)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-2">
                    <p className="text-sm font-medium leading-none">
                      {user.employee?.name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge className={`text-xs ${roleColors[user.employee?.role as keyof typeof roleColors] || roleColors.TECHNICIAN}`}>
                        {roleLabels[user.employee?.role as keyof typeof roleLabels] || "User"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {user.employee?.division}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link to="/profile" className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/settings" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Pengaturan</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Form method="post" action="/auth/logout" className="w-full">
                    <button type="submit" className="flex items-center w-full text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Keluar</span>
                    </button>
                  </Form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}