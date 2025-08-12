import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

const completeTicketSchema = z.object({
  status: z.enum(['RESOLVED', 'CLOSED']),
  resolutionNotes: z.string().min(1, "Resolution notes are required"),
  timeSpent: z.number().min(0).optional()
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
    const data = {
      status: formData.get("status"),
      resolutionNotes: formData.get("resolutionNotes"),
      timeSpent: formData.get("timeSpent") ? parseFloat(formData.get("timeSpent") as string) : undefined
    };
    
    const validation = completeTicketSchema.safeParse(data);
    if (!validation.success) {
      return json({ 
        error: "Validation failed", 
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { status, resolutionNotes, timeSpent } = validation.data;

    // Check if ticket exists and user has permission to complete it
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!ticket) {
      return json({ error: "Ticket not found" }, { status: 404 });
    }

    // Only assigned technician or admin can complete the ticket
    if (ticket.assignedToId !== user.id && user.role !== 'ADMIN') {
      return json({ error: "You can only complete tickets assigned to you" }, { status: 403 });
    }

    if (ticket.status === 'CLOSED') {
      return json({ error: "Ticket is already closed" }, { status: 400 });
    }

    const completedAt = new Date();
    
    // Calculate resolution time if ticket was created
    const resolutionTimeHours = ticket.createdAt ? 
      (completedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60) : 0;

    // Start transaction to complete ticket and update related data
    const result = await db.$transaction(async (tx) => {
      // Update ticket status and completion data
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status,
          completedAt,
          resolutionNotes,
          resolutionTimeHours,
          updatedAt: completedAt
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      });

      // Create status history entry
      await tx.ticketStatusHistory.create({
        data: {
          ticketId,
          status,
          changedById: user.id,
          notes: `Ticket ${status.toLowerCase()}: ${resolutionNotes}`,
          timestamp: completedAt
        }
      });

      // Add resolution note
      await tx.ticketNote.create({
        data: {
          ticketId,
          content: `**Resolution:** ${resolutionNotes}`,
          createdById: user.id,
          isInternal: false
        }
      });

      // Update technician performance metrics if assigned
      if (ticket.assignedToId) {
        const existingMetrics = await tx.employeePerformanceMetrics.findUnique({
          where: { employeeId: ticket.assignedToId }
        });

        if (existingMetrics) {
          const newTotalResolved = existingMetrics.totalTicketsResolved + 1;
          const newAvgResolutionTime = 
            (existingMetrics.averageResolutionTime.toNumber() * existingMetrics.totalTicketsResolved + resolutionTimeHours) / newTotalResolved;

          await tx.employeePerformanceMetrics.update({
            where: { employeeId: ticket.assignedToId },
            data: {
              totalTicketsResolved: newTotalResolved,
              averageResolutionTime: newAvgResolutionTime,
              lastUpdated: completedAt
            }
          });
        } else {
          await tx.employeePerformanceMetrics.create({
            data: {
              employeeId: ticket.assignedToId,
              totalTicketsResolved: 1,
              averageResolutionTime: resolutionTimeHours,
              customerRating: 0,
              lastUpdated: completedAt
            }
          });
        }

        // Update technician handling status if no more active tickets
        const remainingActiveTickets = await tx.ticket.count({
          where: {
            assignedToId: ticket.assignedToId,
            status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] },
            id: { not: ticketId }
          }
        });

        if (remainingActiveTickets === 0) {
          await tx.employee.update({
            where: { id: ticket.assignedToId },
            data: { handlingStatus: 'AVAILABLE' }
          });
        }
      }

      return updatedTicket;
    });

    // Create notification for customer
    if (ticket.customer.email) {
      await db.notification.create({
        data: {
          userId: ticket.customerId,
          type: 'TICKET_UPDATE',
          title: `Ticket ${status === 'RESOLVED' ? 'Resolved' : 'Closed'}`,
          message: `Your ticket #${ticket.id} has been ${status.toLowerCase()}: ${ticket.title}`,
          relatedId: ticketId,
          relatedType: 'TICKET'
        }
      });
    }

    return json({ 
      success: true, 
      message: `Ticket ${status.toLowerCase()} successfully`,
      ticket: result
    });

  } catch (error) {
    console.error("Ticket completion error:", error);
    return json({ error: "Failed to complete ticket" }, { status: 500 });
  }
}