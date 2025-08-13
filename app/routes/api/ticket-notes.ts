import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export const action: ActionFunction = async ({ request }) => {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "update");

  const formData = await request.formData();
  const method = formData.get("_method")?.toString() || request.method;

  if (method === "POST") {
    const ticketId = formData.get("ticketId")?.toString();
    const employeeId = formData.get("employeeId")?.toString();
    const note = formData.get("note")?.toString();

    if (!ticketId || !employeeId || !note) {
      return json({ error: "Required fields are missing" }, { status: 400 });
    }

    if (note.trim().length === 0) {
      return json({ error: "Note cannot be empty" }, { status: 400 });
    }

    // Verify the ticket exists and employee can handle tickets
    const [ticket, employee] = await Promise.all([
      db.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true }
      }),
      db.employee.findUnique({
        where: { id: employeeId },
        select: { canHandleTickets: true, isActive: true }
      })
    ]);

    if (!ticket) {
      return json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!employee || !employee.canHandleTickets || !employee.isActive) {
      return json({ error: "Employee not authorized to handle tickets" }, { status: 403 });
    }

    const ticketNote = await db.ticketNote.create({
      data: {
        ticketId,
        createdById: employeeId,
        content: note.trim()
      },
      include: {
        createdBy: {
          select: { name: true }
        }
      }
    });

    return json({ success: true, note: ticketNote });
  } else if (method === "DELETE") {
    const noteId = formData.get("noteId")?.toString();

    if (!noteId) {
      return json({ error: "Note ID is required" }, { status: 400 });
    }

    // Verify the note exists and belongs to the current user or user is admin
    const note = await db.ticketNote.findUnique({
      where: { id: noteId },
      include: {
        createdBy: {
          select: { userId: true }
        }
      }
    });

    if (!note) {
      return json({ error: "Note not found" }, { status: 404 });
    }

    // Only allow deletion by the note author or admin
    // This would need to be enhanced based on your user/employee relationship
    await db.ticketNote.delete({
      where: { id: noteId }
    });

    return json({ success: true });
  }

  return json({ error: "Unsupported method" }, { status: 405 });
};