import { redirect } from "@remix-run/node";
import type { User } from "./auth.server";
import { hasPermission, canAccessRoute } from "./permissions.server";

// Middleware to protect routes based on permissions
export function requirePermission(
  user: User,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete',
  context?: Record<string, any>
) {
  if (!hasPermission(user, resource, action, context)) {
    throw new Response("Forbidden", { 
      status: 403,
      statusText: "You don't have permission to access this resource"
    });
  }
}

// Middleware to protect routes based on route access
export function requireRouteAccess(user: User, route: string) {
  if (!canAccessRoute(user, route)) {
    throw new Response("Forbidden", { 
      status: 403,
      statusText: "You don't have permission to access this page"
    });
  }
}

// Middleware to require specific roles
export function requireRole(user: User, allowedRoles: string[]) {
  if (!user.employee || !allowedRoles.includes(user.employee.role)) {
    throw new Response("Forbidden", { 
      status: 403,
      statusText: "You don't have the required role to access this resource"
    });
  }
}

// Middleware to require admin access
export function requireAdmin(user: User) {
  requireRole(user, ['ADMIN']);
}

// Middleware to require ticket handling capability
export function requireTicketHandler(user: User) {
  if (!user.employee?.canHandleTickets) {
    throw new Response("Forbidden", { 
      status: 403,
      statusText: "You don't have permission to handle tickets"
    });
  }
}

// Helper to check if user owns a resource
export function requireOwnership(
  user: User,
  resourceUserId: string,
  allowAdminOverride: boolean = true
) {
  const isOwner = user.id === resourceUserId;
  const isAdmin = user.employee?.role === 'ADMIN';
  
  if (!isOwner && !(allowAdminOverride && isAdmin)) {
    throw new Response("Forbidden", { 
      status: 403,
      statusText: "You can only access your own resources"
    });
  }
}

// Helper to check if user is assigned to a ticket
export function requireTicketAssignment(
  user: User,
  ticketAssignedToId: string | null,
  allowAdminOverride: boolean = true
) {
  const isAssigned = user.employee?.id === ticketAssignedToId;
  const isAdmin = user.employee?.role === 'ADMIN';
  
  if (!isAssigned && !(allowAdminOverride && isAdmin)) {
    throw new Response("Forbidden", { 
      status: 403,
      statusText: "You can only access tickets assigned to you"
    });
  }
}