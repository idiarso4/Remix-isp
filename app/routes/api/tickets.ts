import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { TicketStatus, TicketPriority, TicketCategory } from "@prisma/client";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "read");

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const assignedTo = url.searchParams.get("assignedTo");
  const customerId = url.searchParams.get("customer");

  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }
  if (priority && priority !== "all") {
    where.priority = priority.toUpperCase();
  }
  if (assignedTo && assignedTo !== "all") {
    if (assignedTo === "unassigned") {
      where.assignedToId = null;
    } else {
      where.assignedToId = assignedTo;
    }
  }
  if (customerId) {
    where.customerId = customerId;
  }

  const tickets = await db.ticket.findMany({
    where,
    include: {
      customer: {
        select: { id: true, name: true, email: true }
      },
      assignedTo: {
        select: { id: true, name: true }
      }
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "desc" }
    ],
  });

  return json({ tickets });
};

export const action: ActionFunction = async ({ request }) => {
  const user = await requireAuth(request);
  const formData = await request.formData();
  const method = formData.get("_method")?.toString() || request.method;

  if (method === "POST") {
    requirePermission(user, "tickets", "create");
    
    const title = formData.get("title")?.toString();
    const description = formData.get("description")?.toString();
    const customerId = formData.get("customerId")?.toString();
    const priorityString = formData.get("priority")?.toString();
    const categoryString = formData.get("category")?.toString();
    const assignedToId = formData.get("assignedToId")?.toString() || null;

    if (!title || !description || !customerId || !priorityString || !categoryString) {
      return json({ error: "Required fields are missing" }, { status: 400 });
    }

    const priority = priorityString as TicketPriority;
    const category = categoryString as TicketCategory;

    // Update technician workload if assigned
    if (assignedToId) {
      await db.employee.update({
        where: { id: assignedToId },
        data: {
          currentTicketCount: {
            increment: 1
          }
        }
      });
    }

    const ticket = await db.ticket.create({
      data: {
        title,
        description,
        customerId,
        priority,
        category,
        assignedToId,
        status: TicketStatus.OPEN,
      },
    });

    // Create status history entry
    if (assignedToId) {
      await db.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          fromStatus: null,
          toStatus: "ASSIGNED",
          changedBy: assignedToId,
          reason: "Initial assignment"
        }
      });
    }

    return redirect(`/tickets/${ticket.id}`);
  } else if (method === "PUT") {
    requirePermission(user, "tickets", "update");
    
    const id = formData.get("id")?.toString();
    if (!id) {
      return json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const title = formData.get("title")?.toString();
    const description = formData.get("description")?.toString();
    const statusString = formData.get("status")?.toString();
    const priorityString = formData.get("priority")?.toString();
    const categoryString = formData.get("category")?.toString();
    const assignedToId = formData.get("assignedToId")?.toString() || null;

    if (!title || !description || !statusString || !priorityString || !categoryString) {
      return json({ error: "Required fields are missing" }, { status: 400 });
    }

    const status = statusString as TicketStatus;
    const priority = priorityString as TicketPriority;
    const category = categoryString as TicketCategory;

    // Get current ticket to check for changes
    const currentTicket = await db.ticket.findUnique({
      where: { id },
      select: { status: true, assignedToId: true }
    });

    if (!currentTicket) {
      return json({ error: "Ticket not found" }, { status: 404 });
    }

    // Handle assignment changes
    if (currentTicket.assignedToId !== assignedToId) {
      // Decrease count for previous technician
      if (currentTicket.assignedToId) {
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
      if (assignedToId) {
        await db.employee.update({
          where: { id: assignedToId },
          data: {
            currentTicketCount: {
              increment: 1
            }
          }
        });
      }
    }

    // Handle status changes
    if (currentTicket.status !== status) {
      // If resolving or closing, decrease technician workload
      if ((status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) && assignedToId) {
        await db.employee.update({
          where: { id: assignedToId },
          data: {
            currentTicketCount: {
              decrement: 1
            }
          }
        });
      }
    }

    const updateData: any = {
      title,
      description,
      status,
      priority,
      category,
      assignedToId,
    };

    // Set completion date if resolving
    if (status === TicketStatus.RESOLVED && currentTicket.status !== TicketStatus.RESOLVED) {
      updateData.completedAt = new Date();
    }

    await db.ticket.update({
      where: { id },
      data: updateData,
    });

    // Create status history entry if status changed
    if (currentTicket.status !== status && assignedToId) {
      await db.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: currentTicket.status,
          toStatus: status,
          changedBy: assignedToId,
          reason: "Status updated"
        }
      });
    }

    return redirect(`/tickets/${id}`);
  } else if (method === "DELETE") {
    requirePermission(user, "tickets", "delete");
    
    const id = formData.get("id")?.toString();
    if (!id) {
      return json({ error: "Ticket ID is required" }, { status: 400 });
    }

    // Get ticket to update technician workload
    const ticket = await db.ticket.findUnique({
      where: { id },
      select: { assignedToId: true, status: true }
    });

    if (ticket?.assignedToId && ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      await db.employee.update({
        where: { id: ticket.assignedToId },
        data: {
          currentTicketCount: {
            decrement: 1
          }
        }
      });
    }

    await db.ticket.delete({
      where: { id },
    });

    return redirect("/tickets");
  }

  return json({ error: "Unsupported method" }, { status: 405 });
};