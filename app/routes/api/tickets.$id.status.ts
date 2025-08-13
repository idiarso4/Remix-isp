import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { notifyTicketStatusChanged } from "~/lib/notifications.server";

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED']),
  reason: z.string().optional(),
  resolutionNote: z.string().optional()
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
    
    const validation = updateStatusSchema.safeParse(data);
    if (!validation.success) {
      return json({ 
        error: "Invalid data", 
        errors: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { status, reason, resolutionNote } = validation.data;

    // Check if ticket exists
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: { assignedTo: true }
    });

    if (!ticket) {
      return json({ error: "Ticket not found" }, { status: 404 });
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'OPEN': ['IN_PROGRESS', 'CLOSED'],
      'IN_PROGRESS': ['PENDING', 'RESOLVED', 'OPEN'],
      'PENDING': ['IN_PROGRESS', 'RESOLVED'],
      'RESOLVED': ['CLOSED', 'IN_PROGRESS'], // Can reopen if needed
      'CLOSED': [] // Cannot change from closed
    };

    if (!validTransitions[ticket.status]?.includes(status)) {
      return json({ 
        error: `Cannot change status from ${ticket.status} to ${status}` 
      }, { status: 400 });
    }

    // Start transaction
    const result = await db.$transaction(async (tx) => {
      // Prepare update data
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      // Set completion date if resolving or closing
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updateData.completedAt = new Date();
      } else if (ticket.completedAt && (status === 'IN_PROGRESS' || status === 'PENDING')) {
        // Clear completion date if reopening
        updateData.completedAt = null;
      }

      // Update ticket
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          customer: true,
          assignedTo: true
        }
      });

      // Create status history record
      await tx.ticketStatusHistory.create({
        data: {
          ticketId,
          fromStatus: ticket.status,
          toStatus: status,
          changedBy: user.employee!.id,
          reason: reason || `Status changed to ${status}`
        }
      });

      // Add resolution note if provided
      if (resolutionNote && (status === 'RESOLVED' || status === 'CLOSED')) {
        await tx.ticketNote.create({
          data: {
            ticketId,
            createdById: user.employee!.id,
            note: `Resolution: ${resolutionNote}`
          }
        });
      }

      // Add status change note
      await tx.ticketNote.create({
        data: {
          ticketId,
          createdById: user.employee!.id,
          note: `Status changed from ${ticket.status} to ${status}${reason ? `. Reason: ${reason}` : ''}`
        }
      });

      // Update technician's current ticket count if resolving/closing
      if (ticket.assignedToId && (status === 'RESOLVED' || status === 'CLOSED')) {
        await tx.employee.update({
          where: { id: ticket.assignedToId },
          data: {
            currentTicketCount: {
              decrement: 1
            }
          }
        });

        // Update performance metrics
        if (status === 'RESOLVED') {
          const performance = await tx.employeePerformanceMetrics.findUnique({
            where: { employeeId: ticket.assignedToId }
          });

          if (performance) {
            const resolutionTime = ticket.createdAt && updateData.completedAt 
              ? (updateData.completedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60) // hours
              : 0;

            const newTotal = performance.totalTicketsResolved + 1;
            const newAverage = ((performance.averageResolutionTime.toNumber() * performance.totalTicketsResolved) + resolutionTime) / newTotal;

            await tx.employeePerformanceMetrics.update({
              where: { employeeId: ticket.assignedToId },
              data: {
                totalTicketsResolved: newTotal,
                averageResolutionTime: newAverage,
                ticketsResolvedThisMonth: {
                  increment: 1
                },
                lastUpdated: new Date()
              }
            });
          } else {
            // Create performance record if doesn't exist
            await tx.employeePerformanceMetrics.create({
              data: {
                employeeId: ticket.assignedToId,
                totalTicketsResolved: 1,
                averageResolutionTime: ticket.createdAt && updateData.completedAt 
                  ? (updateData.completedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)
                  : 0,
                ticketsResolvedThisMonth: 1
              }
            });
          }
        }
      }

      return updatedTicket;
    });

    // Send notifications
    await notifyTicketStatusChanged(ticketId, ticket.status, status, user.employee!.id);

    return json({ 
      success: true, 
      message: `Ticket status updated to ${status}`,
      ticket: result 
    });

  } catch (error) {
    console.error("Error updating ticket status:", error);
    return json({ error: "Failed to update ticket status" }, { status: 500 });
  }
}