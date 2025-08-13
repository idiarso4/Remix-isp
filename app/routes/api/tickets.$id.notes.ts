import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

const createNoteSchema = z.object({
  note: z.string().min(1, "Note content is required").max(1000, "Note is too long")
});

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, 'tickets', 'read');

  const ticketId = params.id;
  if (!ticketId) {
    return json({ error: "Ticket ID is required" }, { status: 400 });
  }

  try {
    const notes = await db.ticketNote.findMany({
      where: { ticketId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return json({ notes });
  } catch (error) {
    console.error("Error fetching ticket notes:", error);
    return json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const method = request.method;

  const ticketId = params.id;
  if (!ticketId) {
    return json({ error: "Ticket ID is required" }, { status: 400 });
  }

  if (method === "POST") {
    requirePermission(user, 'tickets', 'update');

    try {
      const formData = await request.formData();
      const data = Object.fromEntries(formData);

      const validation = createNoteSchema.safeParse(data);
      if (!validation.success) {
        return json({
          error: "Invalid data",
          errors: validation.error.flatten().fieldErrors
        }, { status: 400 });
      }

      const { note } = validation.data;

      // Check if ticket exists
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true }
      });

      if (!ticket) {
        return json({ error: "Ticket not found" }, { status: 404 });
      }

      // Create note
      const newNote = await db.ticketNote.create({
        data: {
          ticketId,
          createdById: user.employee!.id,
          note
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      });

      return json({
        success: true,
        message: "Note added successfully",
        note: newNote
      });

    } catch (error) {
      console.error("Error creating ticket note:", error);
      return json({ error: "Failed to create note" }, { status: 500 });
    }
  }

  if (method === "DELETE") {
    requirePermission(user, 'tickets', 'update');

    try {
      const formData = await request.formData();
      const noteId = formData.get("noteId")?.toString();

      if (!noteId) {
        return json({ error: "Note ID is required" }, { status: 400 });
      }

      // Check if note exists and belongs to the ticket
      const note = await db.ticketNote.findFirst({
        where: {
          id: noteId,
          ticketId
        },
        select: {
          id: true,
          employeeId: true
        }
      });

      if (!note) {
        return json({ error: "Note not found" }, { status: 404 });
      }

      // Only allow deletion by the note author or admin
      if (note.createdById !== user.employee!.id && user.employee!.role !== 'ADMIN') {
        return json({ error: "Not authorized to delete this note" }, { status: 403 });
      }

      await db.ticketNote.delete({
        where: { id: noteId }
      });

      return json({
        success: true,
        message: "Note deleted successfully"
      });

    } catch (error) {
      console.error("Error deleting ticket note:", error);
      return json({ error: "Failed to delete note" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}