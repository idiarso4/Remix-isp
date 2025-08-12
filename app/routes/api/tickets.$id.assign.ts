import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { notifyTicketAssigned } from "~/lib/notifications.server";

const assignTicketSchema = z.object({
  assignedToId: z.string().min(1, "Technician is required"),
  reason: z.string().optional()
});

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, 'tickets', 'update');

  const ticketId = params.id;
  if (!ticketId) {
    return json({ error: "Ticket ID is required" }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    
    const validation = assignTicketSchema.safeParse(data);
    if (!validation.success) {
      return json({ 
        error: "Invalid data", 
        errors: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { assignedToId, reason } = validation.data;

    // Check if ticket exists
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: { 
        assignedTo: true,
        customer: true 
      }
    });

    if (!ticket) {
      return json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check if technician exists and can handle tickets
    const technician = await db.employee.findUnique({
      where: { id: assignedToId },
      select: {
        id: true,
        name: true,
        canHandleTickets: true,
        isActive: true,
        maxConcurrentTickets: true,
        currentTicketCount: true,
        handlingStatus: true
      }
    });

    if (!technician) {
      return json({ error: "Technician not found" }, { status: 404 });
    }

    if (!technician.canHandleTickets || !technician.isActive) {
      return json({ error: "Technician cannot handle tickets" }, { status: 400 });
    }

    if (technician.handlingStatus === 'OFFLINE') {
      return json({ error: "Technician is currently offline" }, { status: 400 });
    }

    // Check workload limits
    if (technician.currentTicketCount >= technician.maxConcurrentTickets) {
      return json({ 
        error: `Technician has reached maximum concurrent tickets (${technician.maxConcurrentTickets})` 
      }, { status: 400 });
    }

    // Start transaction
    const result = await db.$transaction(async (tx) => {
      // Update previous technician's workload if ticket was already assigned
      if (ticket.assignedToId && ticket.assignedToId !== assignedToId) {
        await tx.employee.update({
          where: { id: ticket.assignedToId },
          data: {
            currentTicketCount: {
              decrement: 1
            }
          }
        });
      }

      // Update new technician's workload
      if (!ticket.assignedToId || ticket.assignedToId !== assignedToId) {
        await tx.employee.update({
          where: { id: assignedToId },
          data: {
            currentTicketCount: {
              increment: 1
            }
          }
        });
      }

      // Update ticket assignment
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          assignedToId,
          status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
          updatedAt: new Date()
        },
        include: {
          customer: true,
          assignedTo: true
        }
      });

      // Create status history record
      await tx.ticketStatusHistory.create({
        data: {
          ticketId,
          fromStatus: ticket.assignedToId ? 'REASSIGNED' : 'UNASSIGNED',
          toStatus: 'ASSIGNED',
          changedBy: user.employee!.id,
          reason: reason || `Assigned to ${technician.name}`
        }
      });

      // Add assignment note
      const noteText = ticket.assignedToId && ticket.assignedToId !== assignedToId
        ? `Ticket reassigned from ${ticket.assignedTo?.name} to ${technician.name}`
        : `Ticket assigned to ${technician.name}`;

      await tx.ticketNote.create({
        data: {
          ticketId,
          employeeId: user.employee!.id,
          note: `${noteText}${reason ? `. Reason: ${reason}` : ''}`
        }
      });

      return updatedTicket;
    });

    // Send notifications
    await notifyTicketAssigned(ticketId, assignedToId, user.employee!.id);

    return json({ 
      success: true, 
      message: `Ticket assigned to ${technician.name}`,
      ticket: result 
    });

  } catch (error) {
    console.error("Error assigning ticket:", error);
    return json({ error: "Failed to assign ticket" }, { status: 500 });
  }
}