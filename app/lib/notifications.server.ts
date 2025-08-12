import { db } from "~/lib/db.server";

export type NotificationType = 'TICKET_UPDATE' | 'ASSIGNMENT' | 'ESCALATION' | 'SYSTEM_ALERT';
export type RecipientType = 'CUSTOMER' | 'EMPLOYEE';
export type NotificationChannel = 'EMAIL' | 'SMS' | 'IN_APP';

interface CreateNotificationParams {
  type: NotificationType;
  recipientId: string;
  recipientType: RecipientType;
  title: string;
  message: string;
  channel?: NotificationChannel;
}

export async function createNotification({
  type,
  recipientId,
  recipientType,
  title,
  message,
  channel = 'IN_APP'
}: CreateNotificationParams) {
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

    // Here you would integrate with email/SMS services for other channels
    // For now, we'll just handle in-app notifications

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

// Notification templates for different scenarios
export const NotificationTemplates = {
  ticketCreated: (ticketTitle: string, customerName: string) => ({
    title: "New Ticket Created",
    message: `A new ticket "${ticketTitle}" has been created by ${customerName}.`
  }),

  ticketAssigned: (ticketTitle: string, technicianName: string) => ({
    title: "Ticket Assigned",
    message: `Ticket "${ticketTitle}" has been assigned to ${technicianName}.`
  }),

  ticketStatusChanged: (ticketTitle: string, oldStatus: string, newStatus: string) => ({
    title: "Ticket Status Updated",
    message: `Ticket "${ticketTitle}" status changed from ${oldStatus} to ${newStatus}.`
  }),

  ticketResolved: (ticketTitle: string) => ({
    title: "Ticket Resolved",
    message: `Your ticket "${ticketTitle}" has been resolved. Please provide feedback on the service.`
  }),

  ticketEscalated: (ticketTitle: string, reason: string) => ({
    title: "Ticket Escalated",
    message: `Ticket "${ticketTitle}" has been escalated. Reason: ${reason}`
  }),

  assignmentReceived: (ticketTitle: string, customerName: string) => ({
    title: "New Ticket Assignment",
    message: `You have been assigned a new ticket "${ticketTitle}" from ${customerName}.`
  }),

  feedbackReceived: (ticketTitle: string, rating: number) => ({
    title: "Customer Feedback Received",
    message: `Customer provided ${rating}/5 stars feedback for ticket "${ticketTitle}".`
  })
};

// Helper functions for common notification scenarios
export async function notifyTicketCreated(ticketId: string) {
  try {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: true,
        assignedTo: true
      }
    });

    if (!ticket) return;

    const template = NotificationTemplates.ticketCreated(ticket.title, ticket.customer.name);

    // Notify all technicians who can handle tickets
    const technicians = await db.employee.findMany({
      where: {
        canHandleTickets: true,
        isActive: true,
        role: { in: ['ADMIN', 'TECHNICIAN'] }
      }
    });

    const notifications = technicians.map(technician =>
      createNotification({
        type: 'TICKET_UPDATE',
        recipientId: technician.id,
        recipientType: 'EMPLOYEE',
        title: template.title,
        message: template.message
      })
    );

    await Promise.all(notifications);
  } catch (error) {
    console.error("Error notifying ticket created:", error);
  }
}

export async function notifyTicketAssigned(ticketId: string, assignedToId: string, assignedById: string) {
  try {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: true,
        assignedTo: true
      }
    });

    if (!ticket || !ticket.assignedTo) return;

    const assignedBy = await db.employee.findUnique({
      where: { id: assignedById }
    });

    // Notify the assigned technician
    const assignmentTemplate = NotificationTemplates.assignmentReceived(
      ticket.title, 
      ticket.customer.name
    );

    await createNotification({
      type: 'ASSIGNMENT',
      recipientId: assignedToId,
      recipientType: 'EMPLOYEE',
      title: assignmentTemplate.title,
      message: assignmentTemplate.message
    });

    // Notify customer about assignment
    const customerTemplate = NotificationTemplates.ticketAssigned(
      ticket.title,
      ticket.assignedTo.name
    );

    await createNotification({
      type: 'TICKET_UPDATE',
      recipientId: ticket.customerId,
      recipientType: 'CUSTOMER',
      title: customerTemplate.title,
      message: customerTemplate.message
    });

  } catch (error) {
    console.error("Error notifying ticket assigned:", error);
  }
}

export async function notifyTicketStatusChanged(
  ticketId: string, 
  oldStatus: string, 
  newStatus: string,
  changedById: string
) {
  try {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: true,
        assignedTo: true
      }
    });

    if (!ticket) return;

    const template = NotificationTemplates.ticketStatusChanged(
      ticket.title,
      oldStatus,
      newStatus
    );

    // Notify customer
    await createNotification({
      type: 'TICKET_UPDATE',
      recipientId: ticket.customerId,
      recipientType: 'CUSTOMER',
      title: template.title,
      message: template.message
    });

    // Notify assigned technician if different from who made the change
    if (ticket.assignedToId && ticket.assignedToId !== changedById) {
      await createNotification({
        type: 'TICKET_UPDATE',
        recipientId: ticket.assignedToId,
        recipientType: 'EMPLOYEE',
        title: template.title,
        message: template.message
      });
    }

    // Special handling for resolved tickets
    if (newStatus === 'RESOLVED') {
      const resolvedTemplate = NotificationTemplates.ticketResolved(ticket.title);
      
      await createNotification({
        type: 'TICKET_UPDATE',
        recipientId: ticket.customerId,
        recipientType: 'CUSTOMER',
        title: resolvedTemplate.title,
        message: resolvedTemplate.message
      });
    }

  } catch (error) {
    console.error("Error notifying ticket status changed:", error);
  }
}

export async function notifyFeedbackReceived(ticketId: string, rating: number) {
  try {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignedTo: true
      }
    });

    if (!ticket || !ticket.assignedTo) return;

    const template = NotificationTemplates.feedbackReceived(ticket.title, rating);

    // Notify the assigned technician
    await createNotification({
      type: 'TICKET_UPDATE',
      recipientId: ticket.assignedToId!,
      recipientType: 'EMPLOYEE',
      title: template.title,
      message: template.message
    });

    // Notify managers if rating is low (1-2 stars)
    if (rating <= 2) {
      const managers = await db.employee.findMany({
        where: {
          role: { in: ['ADMIN', 'HR'] },
          isActive: true
        }
      });

      const escalationTemplate = NotificationTemplates.ticketEscalated(
        ticket.title,
        `Low customer satisfaction rating: ${rating}/5 stars`
      );

      const notifications = managers.map(manager =>
        createNotification({
          type: 'ESCALATION',
          recipientId: manager.id,
          recipientType: 'EMPLOYEE',
          title: escalationTemplate.title,
          message: escalationTemplate.message
        })
      );

      await Promise.all(notifications);
    }

  } catch (error) {
    console.error("Error notifying feedback received:", error);
  }
}