import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, 'tickets', 'read');

  const ticketId = params.id;
  if (!ticketId) {
    return json({ error: "Ticket ID is required" }, { status: 400 });
  }

  try {
    // Check if ticket exists
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true }
    });

    if (!ticket) {
      return json({ error: "Ticket not found" }, { status: 404 });
    }

    // Get status history
    const history = await db.ticketStatusHistory.findMany({
      where: { ticketId },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    return json({ history });
  } catch (error) {
    console.error("Error fetching ticket history:", error);
    return json({ error: "Failed to fetch history" }, { status: 500 });
  }
}