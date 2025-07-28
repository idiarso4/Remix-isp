import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

const statusConfig = {
  // Customer Status
  ACTIVE: { label: "Aktif", className: "bg-green-100 text-green-700 border-green-300" },
  INACTIVE: { label: "Tidak Aktif", className: "bg-gray-100 text-gray-700 border-gray-300" },
  SUSPENDED: { label: "Suspended", className: "bg-red-100 text-red-700 border-red-300" },

  // Ticket Status
  OPEN: { label: "Terbuka", className: "bg-blue-100 text-blue-700 border-blue-300" },
  IN_PROGRESS: { label: "Dalam Proses", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  PENDING: { label: "Menunggu", className: "bg-orange-100 text-orange-700 border-orange-300" },
  RESOLVED: { label: "Selesai", className: "bg-green-100 text-green-700 border-green-300" },
  CLOSED: { label: "Ditutup", className: "bg-gray-100 text-gray-700 border-gray-300" },

  // Ticket Priority
  LOW: { label: "Rendah", className: "bg-gray-100 text-gray-700 border-gray-300" },
  MEDIUM: { label: "Sedang", className: "bg-blue-100 text-blue-700 border-blue-300" },
  HIGH: { label: "Tinggi", className: "bg-orange-100 text-orange-700 border-orange-300" },
  URGENT: { label: "Mendesak", className: "bg-red-100 text-red-700 border-red-300" },

  // Payment Status
  PAID: { label: "Lunas", className: "bg-green-100 text-green-700 border-green-300" },
  OVERDUE: { label: "Terlambat", className: "bg-red-100 text-red-700 border-red-300" },

  // Employee Status
  AVAILABLE: { label: "Tersedia", className: "bg-green-100 text-green-700 border-green-300" },
  BUSY: { label: "Sibuk", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  OFFLINE: { label: "Offline", className: "bg-gray-100 text-gray-700 border-gray-300" },

  // Role Status
  ADMIN: { label: "Administrator", className: "bg-red-100 text-red-700 border-red-300" },
  TECHNICIAN: { label: "Teknisi", className: "bg-blue-100 text-blue-700 border-blue-300" },
  MARKETING: { label: "Marketing", className: "bg-green-100 text-green-700 border-green-300" },
  HR: { label: "Human Resources", className: "bg-purple-100 text-purple-700 border-purple-300" },
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig];
  
  if (!config) {
    return (
      <Badge variant={variant} className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge 
      variant={variant || "outline"} 
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

// Helper function to get status color class
export function getStatusColor(status: string): string {
  const config = statusConfig[status as keyof typeof statusConfig];
  return config?.className || "bg-gray-100 text-gray-700 border-gray-300";
}

// Helper function to get status label
export function getStatusLabel(status: string): string {
  const config = statusConfig[status as keyof typeof statusConfig];
  return config?.label || status;
}