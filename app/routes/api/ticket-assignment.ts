import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export const action: ActionFunction = async ({ request }) => {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "update");

  const formData = await request.formData();
  const ticketId = formData.get("ticketId")?.toString();
  const assignedToId = formData.get("assignedToId")?.toString();
  const reason = formData.get("reason")?.toString() || "Manual assignment";

  if (!ticketId) {
    return json({ error: "Ticket ID is required" }, { status: 400 });
  }

  // Get current ticket assignment
  const currentTicket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { assignedToId: true, status: true }
  });

  if (!currentTicket) {
    return json({ error: "Ticket not found" }, { status: 404 });
  }

  // If assigning to someone new
  if (assignedToId && assignedToId !== currentTicket.assignedToId) {
    // Check if new technician is available
    const technician = await db.employee.findUnique({
      where: { id: assignedToId },
      select: { 
        currentTicketCount: true, 
        maxConcurrentTickets: true, 
        handlingStatus: true,
        canHandleTickets: true,
        isActive: true
      }
    });

    if (!technician) {
      return json({ error: "Technician not found" }, { status: 404 });
    }

    if (!technician.canHandleTickets || !technician.isActive) {
      return json({ error: "Technician is not available to handle tickets" }, { status: 400 });
    }

    if (technician.handlingStatus === "OFFLINE") {
      return json({ error: "Technician is currently offline" }, { status: 400 });
    }

    if (technician.currentTicketCount >= technician.maxConcurrentTickets) {
      return json({ error: "Technician has reached maximum concurrent tickets" }, { status: 400 });
    }

    // Update workload counts
    if (currentTicket.assignedToId) {
      // Decrease count for previous technician
      await db.employee.update({
        where: { id: currentTicket.assignedToId },
        data: {
          currentTicketCount: {
            decrement: 1
          }
        }
      });
    }

    // Increase count for new technician
    await db.employee.update({
      where: { id: assignedToId },
      data: {
        currentTicketCount: {
          increment: 1
        }
      }
    });
  } else if (!assignedToId && currentTicket.assignedToId) {
    // Unassigning ticket
    await db.employee.update({
      where: { id: currentTicket.assignedToId },
      data: {
        currentTicketCount: {
          decrement: 1
        }
      }
    });
  }

  // Update ticket assignment
  await db.ticket.update({
    where: { id: ticketId },
    data: {
      assignedToId: assignedToId || null
    }
  });

  // Create status history entry
  if (assignedToId) {
    await db.ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus: currentTicket.assignedToId ? "ASSIGNED" : null,
        toStatus: "ASSIGNED",
        changedById: assignedToId,
        reason
      }
    });
  }

  return json({ success: true });
};