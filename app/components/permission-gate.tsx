import { ReactNode } from "react";
import type { User } from "~/lib/auth.server";
import { AccessDenied } from "./access-denied";

interface PermissionGateProps {
  user: User;
  resource?: string;
  action?: 'create' | 'read' | 'update' | 'delete';
  route?: string;
  context?: Record<string, any>;
  children: ReactNode;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
}

// Simple permission check based on role
function hasBasicPermission(user: User, resource: string, action: string): boolean {
  if (!user.employee) return false;
  
  const role = user.employee.role;
  
  // Admin has access to everything
  if (role === 'ADMIN') return true;
  
  // Basic role-based permissions
  switch (resource) {
    case 'customers':
      return ['ADMIN', 'MARKETING', 'TECHNICIAN', 'HR'].includes(role);
    case 'packages':
      return ['ADMIN', 'MARKETING'].includes(role);
    case 'tickets':
      return ['ADMIN', 'TECHNICIAN', 'MARKETING'].includes(role);
    case 'employees':
      return ['ADMIN', 'HR'].includes(role) || (action === 'read' && ['TECHNICIAN', 'MARKETING'].includes(role));
    case 'reports':
      return ['ADMIN', 'MARKETING', 'HR', 'TECHNICIAN'].includes(role);
    default:
      return false;
  }
}

export function PermissionGate({
  user,
  resource,
  action = 'read',
  route,
  context,
  children,
  fallback,
  showAccessDenied = false
}: PermissionGateProps) {
  let hasAccess = false;

  if (route) {
    // Simple route access check
    hasAccess = user.employee?.role === 'ADMIN' || true; // For now, allow all authenticated users
  } else if (resource) {
    hasAccess = hasBasicPermission(user, resource, action);
  }

  if (!hasAccess) {
    if (showAccessDenied) {
      return <AccessDenied />;
    }
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

// Hook for checking permissions in components
export function usePermissions(user: User) {
  return {
    hasPermission: (resource: string, action: 'create' | 'read' | 'update' | 'delete', context?: Record<string, any>) =>
      hasBasicPermission(user, resource, action),
    canAccessRoute: (route: string) => user.employee?.role === 'ADMIN' || true,
    isAdmin: () => user.employee?.role === 'ADMIN',
    isTechnician: () => user.employee?.role === 'TECHNICIAN',
    isMarketing: () => user.employee?.role === 'MARKETING',
    isHR: () => user.employee?.role === 'HR',
    canHandleTickets: () => user.employee?.canHandleTickets || false,
    role: user.employee?.role || '',
  };
}