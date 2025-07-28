import { useRouteLoaderData } from "@remix-run/react";
import type { User } from "~/lib/auth.server";

// Hook to get current user from route loader data
export function useUser(): User | null {
  const data = useRouteLoaderData("routes/_app") as { user: User } | undefined;
  return data?.user || null;
}

// Hook for checking permissions in components
export function usePermissions() {
  const user = useUser();

  if (!user) {
    return {
      hasPermission: () => false,
      canAccessRoute: () => false,
      isAdmin: () => false,
      isTechnician: () => false,
      isMarketing: () => false,
      isHR: () => false,
      canHandleTickets: () => false,
      role: '',
      user: null,
    };
  }

  // Simple client-side permission helpers
  const hasBasicPermission = (resource: string, action: string): boolean => {
    if (!user.employee) return false;
    const role = user.employee.role;
    if (role === 'ADMIN') return true;
    
    switch (resource) {
      case 'customers':
        return ['MARKETING', 'TECHNICIAN', 'HR'].includes(role);
      case 'packages':
        return ['MARKETING'].includes(role);
      case 'tickets':
        return ['TECHNICIAN', 'MARKETING'].includes(role);
      case 'employees':
        return role === 'HR' || (action === 'read' && ['TECHNICIAN', 'MARKETING'].includes(role));
      case 'reports':
        return ['MARKETING', 'HR', 'TECHNICIAN'].includes(role);
      default:
        return false;
    }
  };

  return {
    hasPermission: hasBasicPermission,
    canAccessRoute: (route: string) => user.employee?.role === 'ADMIN' || true,
    isAdmin: () => user.employee?.role === 'ADMIN',
    isTechnician: () => user.employee?.role === 'TECHNICIAN',
    isMarketing: () => user.employee?.role === 'MARKETING',
    isHR: () => user.employee?.role === 'HR',
    canHandleTickets: () => user.employee?.canHandleTickets || false,
    role: user.employee?.role || '',
    user,
  };
}

// Hook for role-based conditional rendering
export function useRoleAccess() {
  const permissions = usePermissions();

  return {
    ...permissions,
    // Helper functions for common role checks
    isAdminOrHR: () => permissions.isAdmin() || permissions.isHR(),
    isAdminOrMarketing: () => permissions.isAdmin() || permissions.isMarketing(),
    isAdminOrTechnician: () => permissions.isAdmin() || permissions.isTechnician(),
    canManageCustomers: () => permissions.hasPermission('customers', 'update'),
    canManagePackages: () => permissions.hasPermission('packages', 'update'),
    canManageTickets: () => permissions.hasPermission('tickets', 'update'),
    canManageEmployees: () => permissions.hasPermission('employees', 'update'),
    canViewReports: () => permissions.hasPermission('reports', 'read'),
  };
}