import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

const unassignTicketSchema = z.object({
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
    
    const validation = unassignTicketSchema.safeParse(data);
    if (!validation.success) {
      return json({ 
        error: "Invalid data", 
        errors: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { reason } = validation.data;

    // Check if ticket exists and is assigned
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: { assignedTo: true }
    });

    if (!ticket) {
      return json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!ticket.assignedToId) {
      return json({ error: "Ticket is not assigned to anyone" }, { status: 400 });
    }

    // Start transaction
    const result = await db.$transaction(async (tx) => {
      // Update ticket to unassign
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          assignedToId: null,
          status: 'OPEN', // Reset to open when unassigned
          updatedAt: new Date()
        },
        include: {
          customer: true,
          assignedTo: true
        }
      });

      // Update technician's ticket count
      if (ticket.assignedToId) {
        await tx.employee.update({
          where: { id: ticket.assignedToId },
          data: {
            currentTicketCount: {
              decrement: 1
            }
          }
        });
      }

      // Create status history record
      await tx.ticketStatusHistory.create({
        data: {
          ticketId,
          status: 'OPEN',
          changedById: user.employee!.id,
          notes: reason || `Unassigned from ${ticket.assignedTo!.name}`
        }
      });

      // Create unassignment note
      await tx.ticketNote.create({
        data: {
          ticketId,
          createdById: user.employee!.id,
          content: `Ticket unassigned from ${ticket.assignedTo!.name}${reason ? `. Reason: ${reason}` : ''}`
        }
      });

      return updatedTicket;
    });

    return json({ 
      success: true, 
      message: `Ticket unassigned from ${ticket.assignedTo!.name}`,
      ticket: result 
    });

  } catch (error) {
    console.error("Error unassigning ticket:", error);
    return json({ error: "Failed to unassign ticket" }, { status: 500 });
  }
}