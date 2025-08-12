import { z } from "zod";

// Common validation patterns
export const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Base schemas
export const idSchema = z.string().min(1, "ID is required");
export const emailSchema = z.string().email("Invalid email format");
export const phoneSchema = z.string().regex(phoneRegex, "Invalid Indonesian phone number format");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
export const nameSchema = z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long");
export const addressSchema = z.string().min(5, "Address must be at least 5 characters").max(500, "Address too long");

// Customer validation schemas
export const createCustomerSchema = z.object({
  name: nameSchema,
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  address: addressSchema.optional().or(z.literal("")),
  location: z.string().max(200, "Location too long").optional().or(z.literal("")),
  packageId: z.string().optional().or(z.literal("")),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE')
}).refine(
  (data) => data.email || data.phone,
  {
    message: "Either email or phone number is required",
    path: ["email"]
  }
);

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  id: idSchema
});

// Employee validation schemas
export const createEmployeeSchema = z.object({
  name: nameSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  position: z.string().min(2, "Position is required").max(100, "Position too long"),
  division: z.string().min(2, "Division is required").max(100, "Division too long"),
  role: z.enum(['ADMIN', 'TECHNICIAN', 'MARKETING', 'HR']),
  hireDate: z.string().min(1, "Hire date is required"),
  canHandleTickets: z.boolean().default(false),
  handlingStatus: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).default('AVAILABLE'),
  maxConcurrentTickets: z.coerce.number().min(1, "Must be at least 1").max(20, "Cannot exceed 20").default(5),
  isActive: z.boolean().default(true)
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  id: idSchema
});

// Package validation schemas
export const createPackageSchema = z.object({
  name: z.string().min(2, "Package name is required").max(100, "Name too long"),
  speed: z.string().min(1, "Speed is required").max(50, "Speed description too long"),
  price: z.coerce.number().positive("Price must be positive").max(100000000, "Price too high"),
  duration: z.enum(['MONTHLY', 'YEARLY']),
  description: z.string().max(1000, "Description too long").optional().or(z.literal("")),
  isActive: z.boolean().default(true)
});

export const updatePackageSchema = createPackageSchema.partial().extend({
  id: idSchema
});

// Ticket validation schemas
export const createTicketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description too long"),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  category: z.enum(['NETWORK_ISSUES', 'EQUIPMENT_DAMAGE', 'INSTALLATION', 'OTHERS']).default('OTHERS'),
  customerId: idSchema,
  assignedToId: z.string().optional().or(z.literal(""))
});

export const updateTicketSchema = z.object({
  id: idSchema,
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title too long").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description too long").optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.enum(['NETWORK_ISSUES', 'EQUIPMENT_DAMAGE', 'INSTALLATION', 'OTHERS']).optional(),
  assignedToId: z.string().optional().or(z.literal(""))
});

// Payment validation schemas
export const createPaymentSchema = z.object({
  customerId: idSchema,
  amount: z.coerce.number().positive("Amount must be positive").max(1000000000, "Amount too high"),
  paymentDate: z.string().min(1, "Payment date is required"),
  status: z.enum(['PAID', 'PENDING', 'OVERDUE']).default('PENDING')
}).refine(
  (data) => {
    const paymentDate = new Date(data.paymentDate);
    const now = new Date();
    return paymentDate <= now;
  },
  {
    message: "Payment date cannot be in the future",
    path: ["paymentDate"]
  }
);

export const updatePaymentSchema = createPaymentSchema.partial().extend({
  id: idSchema
});

// Feedback validation schemas
export const createFeedbackSchema = z.object({
  ticketId: idSchema,
  rating: z.coerce.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().max(1000, "Comment too long").optional().or(z.literal(""))
});

// Note validation schemas
export const createNoteSchema = z.object({
  ticketId: idSchema,
  note: z.string().min(1, "Note content is required").max(2000, "Note too long")
});

// Authentication validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required")
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }
);

// Search validation schemas
export const searchSchema = z.object({
  q: z.string().min(1, "Search query is required").max(200, "Search query too long"),
  type: z.enum(['all', 'customers', 'tickets', 'employees', 'packages']).default('all'),
  limit: z.coerce.number().min(1).max(100).default(10)
});

// Notification validation schemas
export const createNotificationSchema = z.object({
  type: z.enum(['TICKET_UPDATE', 'ASSIGNMENT', 'ESCALATION', 'SYSTEM_ALERT']),
  recipientId: idSchema,
  recipientType: z.enum(['CUSTOMER', 'EMPLOYEE']),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  message: z.string().min(1, "Message is required").max(1000, "Message too long"),
  channel: z.enum(['EMAIL', 'SMS', 'IN_APP']).default('IN_APP')
});

// Assignment validation schemas
export const assignTicketSchema = z.object({
  ticketId: idSchema,
  assignedToId: idSchema,
  reason: z.string().max(500, "Reason too long").optional().or(z.literal(""))
});

export const unassignTicketSchema = z.object({
  ticketId: idSchema,
  reason: z.string().max(500, "Reason too long").optional().or(z.literal(""))
});

// Status update validation schemas
export const updateTicketStatusSchema = z.object({
  ticketId: idSchema,
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED']),
  reason: z.string().max(500, "Reason too long").optional().or(z.literal("")),
  resolutionNote: z.string().max(2000, "Resolution note too long").optional().or(z.literal(""))
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  file: z.any().refine(
    (file) => file instanceof File,
    "File is required"
  ).refine(
    (file) => file.size <= 5 * 1024 * 1024, // 5MB
    "File size must be less than 5MB"
  ).refine(
    (file) => ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'].includes(file.type),
    "File must be an image (JPEG, PNG, GIF) or PDF"
  )
});

// Utility function to validate form data
export function validateFormData<T>(
  formData: FormData,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const rawData = Object.fromEntries(formData);
    const data = schema.parse(rawData);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        if (err.path.length > 0) {
          const path = err.path.join('.');
          errors[path] = err.message;
        }
      });
      return { success: false, errors };
    }
    throw error;
  }
}

// Utility function to validate JSON data
export function validateJsonData<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        if (err.path.length > 0) {
          const path = err.path.join('.');
          errors[path] = err.message;
        }
      });
      return { success: false, errors };
    }
    throw error;
  }
}

// Custom validation rules
export const customValidations = {
  // Check if email is unique (excluding current record)
  uniqueEmail: async (email: string, excludeId?: string) => {
    const existing = await db.user.findFirst({
      where: {
        email,
        ...(excludeId && { id: { not: excludeId } })
      }
    });
    return !existing;
  },

  // Check if customer email is unique
  uniqueCustomerEmail: async (email: string, excludeId?: string) => {
    if (!email) return true; // Email is optional for customers
    
    const existing = await db.customer.findFirst({
      where: {
        email,
        ...(excludeId && { id: { not: excludeId } })
      }
    });
    return !existing;
  },

  // Check if employee can handle more tickets
  canAssignTicket: async (employeeId: string) => {
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: {
        assignedTickets: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] }
          }
        }
      }
    });

    if (!employee) return false;
    if (!employee.canHandleTickets) return false;
    if (employee.handlingStatus !== 'AVAILABLE') return false;
    
    return employee.assignedTickets.length < employee.maxConcurrentTickets;
  },

  // Check if package can be deleted (no active customers)
  canDeletePackage: async (packageId: string) => {
    const activeCustomers = await db.customer.count({
      where: {
        packageId,
        status: 'ACTIVE'
      }
    });
    return activeCustomers === 0;
  },

  // Check if customer can be deleted (no active tickets)
  canDeleteCustomer: async (customerId: string) => {
    const activeTickets = await db.ticket.count({
      where: {
        customerId,
        status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] }
      }
    });
    return activeTickets === 0;
  },

  // Validate ticket status transition
  isValidStatusTransition: (fromStatus: string, toStatus: string) => {
    const validTransitions: Record<string, string[]> = {
      'OPEN': ['IN_PROGRESS', 'CLOSED'],
      'IN_PROGRESS': ['PENDING', 'RESOLVED', 'OPEN'],
      'PENDING': ['IN_PROGRESS', 'RESOLVED'],
      'RESOLVED': ['CLOSED', 'IN_PROGRESS'], // Can reopen if needed
      'CLOSED': [] // Cannot change from closed
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }
};

// Error message translations
export const errorMessages = {
  required: "This field is required",
  invalid_email: "Please enter a valid email address",
  invalid_phone: "Please enter a valid Indonesian phone number",
  password_too_short: "Password must be at least 8 characters",
  passwords_dont_match: "Passwords don't match",
  name_too_short: "Name must be at least 2 characters",
  name_too_long: "Name is too long",
  amount_positive: "Amount must be positive",
  date_future: "Date cannot be in the future",
  file_too_large: "File size must be less than 5MB",
  invalid_file_type: "Invalid file type",
  unique_email: "Email address is already in use",
  cannot_assign: "Cannot assign ticket to this technician",
  cannot_delete: "Cannot delete this record due to dependencies",
  invalid_transition: "Invalid status transition",
  access_denied: "You don't have permission to perform this action"
};

// Validation helper for API routes
export async function validateAndProcess<T>(
  formData: FormData,
  schema: z.ZodSchema<T>,
  customValidations?: Array<{
    field: string;
    validator: (value: any) => Promise<boolean>;
    message: string;
  }>
): Promise<{ success: true; data: T } | { success: false; errors: Record<string, string> }> {
  try {
    // Basic schema validation
    const validation = validateFormData(formData, schema);
    if (!validation.success) {
      return validation;
    }

    // Custom validations
    if (customValidations) {
      const customErrors: Record<string, string> = {};
      
      for (const customValidation of customValidations) {
        const fieldValue = validation.data[customValidation.field as keyof T];
        const isValid = await customValidation.validator(fieldValue);
        
        if (!isValid) {
          customErrors[customValidation.field] = customValidation.message;
        }
      }

      if (Object.keys(customErrors).length > 0) {
        return { success: false, errors: customErrors };
      }
    }

    return validation;
  } catch (error) {
    console.error("Validation error:", error);
    return { 
      success: false, 
      errors: { general: "Validation failed. Please check your input." } 
    };
  }
}