import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

const createNotificationSchema = z.object({
  type: z.enum(['TICKET_UPDATE', 'ASSIGNMENT', 'ESCALATION', 'SYSTEM_ALERT']),
  recipientId: z.string().min(1, "Recipient ID is required"),
  recipientType: z.enum(['CUSTOMER', 'EMPLOYEE']),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  channel: z.enum(['EMAIL', 'SMS', 'IN_APP']).default('IN_APP')
});

const updateNotificationSchema = z.object({
  id: z.string().min(1, "Notification ID is required"),
  status: z.enum(['PENDING', 'SENT', 'FAILED']).optional()
});

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  
  const url = new URL(request.url);
  const recipientId = url.searchParams.get("recipientId");
  const recipientType = url.searchParams.get("recipientType");
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  try {
    const where: any = {};
    
    // If no specific recipient, show notifications for current user
    if (!recipientId) {
      if (user.employee) {
        where.recipientId = user.employee.id;
        where.recipientType = 'EMPLOYEE';
      } else {
        // If user is not an employee, they might be a customer
        where.recipientId = user.id;
        where.recipientType = 'CUSTOMER';
      }
    } else {
      where.recipientId = recipientId;
      if (recipientType) {
        where.recipientType = recipientType.toUpperCase();
      }
    }
    
    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }
    
    if (type && type !== "all") {
      where.type = type.toUpperCase();
    }

    const [notifications, totalCount, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.notification.count({ where }),
      db.notification.count({ 
        where: { 
          ...where, 
          status: 'PENDING' 
        } 
      })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return json({
      notifications,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit
      },
      unreadCount
    });

  } catch (error) {
    console.error("Error fetching notifications:", error);
    return json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const method = request.method;

  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    if (method === "POST") {
      requirePermission(user, 'tickets', 'update'); // Assuming notifications are mainly for tickets
      
      const validation = createNotificationSchema.safeParse(data);
      if (!validation.success) {
        return json({ 
          error: "Invalid data", 
          errors: validation.error.flatten().fieldErrors 
        }, { status: 400 });
      }

      const { type, recipientId, recipientType, title, message, channel } = validation.data;

      const notification = await db.notification.create({
        data: {
          type,
          recipientId,
          recipientType,
          title,
          message,
          channel,
          status: 'PENDING'
        }
      });

      // Here you would trigger the actual notification sending
      // For now, we'll just mark it as sent immediately for in-app notifications
      if (channel === 'IN_APP') {
        await db.notification.update({
          where: { id: notification.id },
          data: { 
            status: 'SENT',
            sentAt: new Date()
          }
        });
      }

      return json({ 
        success: true, 
        message: "Notification created successfully",
        notification 
      });

    } else if (method === "PUT") {
      const validation = updateNotificationSchema.safeParse(data);
      if (!validation.success) {
        return json({ 
          error: "Invalid data", 
          errors: validation.error.flatten().fieldErrors 
        }, { status: 400 });
      }

      const { id, status } = validation.data;

      // Check if notification exists and user has permission to update it
      const existingNotification = await db.notification.findUnique({
        where: { id }
      });

      if (!existingNotification) {
        return json({ error: "Notification not found" }, { status: 404 });
      }

      // Users can only update their own notifications (mark as read, etc.)
      const canUpdate = (
        (existingNotification.recipientType === 'EMPLOYEE' && user.employee?.id === existingNotification.recipientId) ||
        (existingNotification.recipientType === 'CUSTOMER' && user.id === existingNotification.recipientId)
      );

      if (!canUpdate) {
        return json({ error: "Permission denied" }, { status: 403 });
      }

      const updatedNotification = await db.notification.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(status === 'SENT' && { sentAt: new Date() })
        }
      });

      return json({ 
        success: true, 
        message: "Notification updated successfully",
        notification: updatedNotification 
      });

    } else if (method === "DELETE") {
      const notificationId = data.id as string;
      if (!notificationId) {
        return json({ error: "Notification ID is required" }, { status: 400 });
      }

      // Check if notification exists and user has permission to delete it
      const existingNotification = await db.notification.findUnique({
        where: { id: notificationId }
      });

      if (!existingNotification) {
        return json({ error: "Notification not found" }, { status: 404 });
      }

      const canDelete = (
        (existingNotification.recipientType === 'EMPLOYEE' && user.employee?.id === existingNotification.recipientId) ||
        (existingNotification.recipientType === 'CUSTOMER' && user.id === existingNotification.recipientId)
      );

      if (!canDelete) {
        return json({ error: "Permission denied" }, { status: 403 });
      }

      await db.notification.delete({
        where: { id: notificationId }
      });

      return json({ 
        success: true, 
        message: "Notification deleted successfully" 
      });
    }

    return json({ error: "Method not allowed" }, { status: 405 });

  } catch (error) {
    console.error("Error managing notification:", error);
    return json({ error: "Failed to manage notification" }, { status: 500 });
  }
}

// Helper function to create notifications (can be used by other parts of the app)
export async function createNotification({
  type,
  recipientId,
  recipientType,
  title,
  message,
  channel = 'IN_APP'
}: {
  type: 'TICKET_UPDATE' | 'ASSIGNMENT' | 'ESCALATION' | 'SYSTEM_ALERT';
  recipientId: string;
  recipientType: 'CUSTOMER' | 'EMPLOYEE';
  title: string;
  message: string;
  channel?: 'EMAIL' | 'SMS' | 'IN_APP';
}) {
  try {
    const notification = await db.notification.create({
      data: {
        type,
        recipientId,
        recipientType,
        title,
        message,
        channel,
        status: 'PENDING'
      }
    });

    // For in-app notifications, mark as sent immediately
    if (channel === 'IN_APP') {
      await db.notification.update({
        where: { id: notification.id },
        data: { 
          status: 'SENT',
          sentAt: new Date()
        }
      });
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}