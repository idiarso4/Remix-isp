import type { User } from "./auth.server";

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  conditions?: Record<string, any>;
}

export type Role = 'ADMIN' | 'TECHNICIAN' | 'MARKETING' | 'HR';

// Define permissions for each role (client-safe version)
export const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    // Admin has full access to everything
    { resource: '*', action: 'create' },
    { resource: '*', action: 'read' },
    { resource: '*', action: 'update' },
    { resource: '*', action: 'delete' }
  ],
  TECHNICIAN: [
    // Dashboard access
    { resource: 'dashboard', action: 'read' },
    
    // Customer access (read only)
    { resource: 'customers', action: 'read' },
    
    // Tickets access (full for assigned tickets, read for others)
    { resource: 'tickets', action: 'read' },
    { resource: 'tickets', action: 'update', conditions: { assignedTo: 'self' } },
    { resource: 'tickets', action: 'create' }, // Can create tickets
    
    // Ticket notes (can add notes to assigned tickets)
    { resource: 'ticket-notes', action: 'create', conditions: { assignedTo: 'self' } },
    { resource: 'ticket-notes', action: 'read' },
    
    // Employee access (read only for basic info)
    { resource: 'employees', action: 'read' },
    
    // Reports (limited access)
    { resource: 'reports', action: 'read', conditions: { scope: 'own' } }
  ],
  MARKETING: [
    // Dashboard access
    { resource: 'dashboard', action: 'read' },
    
    // Customer management (full access)
    { resource: 'customers', action: 'create' },
    { resource: 'customers', action: 'read' },
    { resource: 'customers', action: 'update' },
    { resource: 'customers', action: 'delete' },
    
    // Package management (full access)
    { resource: 'packages', action: 'create' },
    { resource: 'packages', action: 'read' },
    { resource: 'packages', action: 'update' },
    { resource: 'packages', action: 'delete' },
    
    // Tickets (read only)
    { resource: 'tickets', action: 'read' },
    
    // Reports (marketing focused)
    { resource: 'reports', action: 'read', conditions: { scope: 'marketing' } },
    
    // Employee access (read only)
    { resource: 'employees', action: 'read' }
  ],
  HR: [
    // Dashboard access
    { resource: 'dashboard', action: 'read' },
    
    // Employee management (full access)
    { resource: 'employees', action: 'create' },
    { resource: 'employees', action: 'read' },
    { resource: 'employees', action: 'update' },
    { resource: 'employees', action: 'delete' },
    
    // Customer access (read only)
    { resource: 'customers', action: 'read' },
    
    // Reports (HR focused)
    { resource: 'reports', action: 'read', conditions: { scope: 'hr' } },
    
    // Settings (HR related)
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update', conditions: { scope: 'hr' } }
  ]
};

// Client-safe permission check function
export function hasPermission(
  user: User,
  resource: string,
  action: Permission['action'],
  context?: Record<string, any>
): boolean {
  if (!user.employee) {
    return false;
  }

  const userRole = user.employee.role as Role;
  const permissions = rolePermissions[userRole];

  if (!permissions) {
    return false;
  }

  // Check for wildcard permission (admin)
  const wildcardPermission = permissions.find(
    p => p.resource === '*' && p.action === action
  );
  if (wildcardPermission) {
    return true;
  }

  // Check for specific resource permission
  const specificPermissions = permissions.filter(
    p => p.resource === resource && p.action === action
  );

  if (specificPermissions.length === 0) {
    return false;
  }

  // Check conditions if any
  for (const permission of specificPermissions) {
    if (!permission.conditions) {
      return true; // No conditions, permission granted
    }

    // Check conditions
    let conditionsMet = true;
    for (const [key, value] of Object.entries(permission.conditions)) {
      if (key === 'assignedTo' && value === 'self') {
        // Check if the resource is assigned to the current user
        if (context?.assignedToId !== user.employee.id) {
          conditionsMet = false;
          break;
        }
      } else if (key === 'scope') {
        // Check scope conditions
        if (context?.scope !== value) {
          conditionsMet = false;
          break;
        }
      } else {
        // Generic condition check
        if (context?.[key] !== value) {
          conditionsMet = false;
          break;
        }
      }
    }

    if (conditionsMet) {
      return true;
    }
  }

  return false;
}

// Client-safe route access check function
export function canAccessRoute(user: User, route: string): boolean {
  if (!user.employee) {
    return false;
  }

  const userRole = user.employee.role as Role;

  // Admin can access everything
  if (userRole === 'ADMIN') {
    return true;
  }

  // Route-specific access control
  const routePermissions: Record<string, Role[]> = {
    '/': ['ADMIN', 'TECHNICIAN', 'MARKETING', 'HR'], // Dashboard
    '/customers': ['ADMIN', 'MARKETING', 'TECHNICIAN', 'HR'],
    '/packages': ['ADMIN', 'MARKETING'],
    '/tickets': ['ADMIN', 'TECHNICIAN', 'MARKETING'],
    '/employees': ['ADMIN', 'HR', 'TECHNICIAN', 'MARKETING'], // Read access for all
    '/reports': ['ADMIN', 'MARKETING', 'HR', 'TECHNICIAN'],
    '/settings': ['ADMIN', 'HR']
  };

  const allowedRoles = routePermissions[route];
  return allowedRoles ? allowedRoles.includes(userRole) : false;
}

// Get user role display name
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    'ADMIN': 'Administrator',
    'TECHNICIAN': 'Teknisi',
    'MARKETING': 'Marketing',
    'HR': 'Human Resources'
  };
  return roleNames[role] || role;
}

// Get role badge color
export function getRoleBadgeColor(role: string): string {
  const roleColors: Record<string, string> = {
    'ADMIN': 'bg-red-100 text-red-700 border-red-300',
    'TECHNICIAN': 'bg-blue-100 text-blue-700 border-blue-300',
    'MARKETING': 'bg-green-100 text-green-700 border-green-300',
    'HR': 'bg-purple-100 text-purple-700 border-purple-300'
  };
  return roleColors[role] || 'bg-gray-100 text-gray-700 border-gray-300';
}