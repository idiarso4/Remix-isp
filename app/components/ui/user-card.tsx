import { Link } from "@remix-run/react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Shield,
  Edit,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { User as AuthUser } from "~/lib/auth.server";

interface UserCardProps {
  user: AuthUser;
  employee?: {
    id: string;
    name: string;
    role: string;
    position?: string | null;
    division?: string | null;
    phone?: string | null;
    user: {
      email: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  showEditButton?: boolean;
  className?: string;
}

const roleColors = {
  ADMIN: "bg-red-100 text-red-700 border-red-300",
  TECHNICIAN: "bg-blue-100 text-blue-700 border-blue-300",
  MARKETING: "bg-green-100 text-green-700 border-green-300",
  HR: "bg-purple-100 text-purple-700 border-purple-300",
};

const roleLabels = {
  ADMIN: "Administrator",
  TECHNICIAN: "Teknisi",
  MARKETING: "Marketing",
  HR: "Human Resources",
};

export function UserCard({ 
  user, 
  employee, 
  showEditButton = false, 
  className = "" 
}: UserCardProps) {
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayEmployee = employee || user.employee;
  if (!displayEmployee) return null;

  return (
    <Card className={`bg-white/80 backdrop-blur-sm ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16 border-2 border-gray-200">
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-bold">
              {getUserInitials(displayEmployee.name)}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {displayEmployee.name}
              </h3>
              {showEditButton && (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/profile">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>

            {/* Role Badge */}
            <div className="mb-3">
              <Badge className={`${roleColors[displayEmployee.role as keyof typeof roleColors] || roleColors.TECHNICIAN}`}>
                {roleLabels[displayEmployee.role as keyof typeof roleLabels] || "User"}
              </Badge>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>

              {displayEmployee.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{displayEmployee.phone}</span>
                </div>
              )}

              {displayEmployee.position && (
                <div className="flex items-center text-sm text-gray-600">
                  <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{displayEmployee.position}</span>
                </div>
              )}

              {displayEmployee.division && (
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{displayEmployee.division}</span>
                </div>
              )}



              {employee?.user?.createdAt && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>
                    Bergabung {format(new Date(employee.user.createdAt), "dd MMMM yyyy", { locale: id })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function UserCardCompact({ user, className = "" }: { user: AuthUser; className?: string }) {
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user.employee) return null;

  return (
    <div className={`flex items-center space-x-3 p-3 bg-white/80 backdrop-blur-sm rounded-lg border ${className}`}>
      <Avatar className="h-10 w-10 border-2 border-gray-200">
        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
          {getUserInitials(user.employee.name)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user.employee.name}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {user.email}
        </p>
      </div>
      
      <Badge className={`text-xs ${roleColors[user.employee.role as keyof typeof roleColors] || roleColors.TECHNICIAN}`}>
        {roleLabels[user.employee.role as keyof typeof roleLabels] || "User"}
      </Badge>
    </div>
  );
}