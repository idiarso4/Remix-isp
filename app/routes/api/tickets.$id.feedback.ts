import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { notifyFeedbackReceived } from "~/lib/notifications.server";

const feedbackSchema = z.object({
  rating: z.coerce.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().optional()
});

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, 'tickets', 'read');

  const ticketId = params.id;
  if (!ticketId) {
    return json({ error: "Ticket ID is required" }, { status: 400 });
  }

  try {
    const feedback = await db.ticketFeedback.findUnique({
      where: { ticketId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        ticket: {
          select: {
            id: true,
            title: true,
            status: true,
            assignedTo: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    return json({ feedback });
  } catch (error) {
    console.error("Error fetching ticket feedback:", error);
    return json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

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
    
    const validation = feedbackSchema.safeParse(data);
    if (!validation.success) {
      return json({ 
        error: "Invalid data", 
        errors: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { rating, comment } = validation.data;

    // Check if ticket exists and is resolved/closed
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: true,
        assignedTo: true,
        feedback: true
      }
    });

    if (!ticket) {
      return json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return json({ error: "Feedback can only be provided for resolved or closed tickets" }, { status: 400 });
    }

    if (ticket.feedback) {
      return json({ error: "Feedback has already been provided for this ticket" }, { status: 400 });
    }

    // Start transaction
    const result = await db.$transaction(async (tx) => {
      // Create feedback
      const feedback = await tx.ticketFeedback.create({
        data: {
          ticketId,
          customerId: ticket.customerId,
          rating,
          comment: comment || null
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          ticket: {
            select: {
              id: true,
              title: true,
              assignedTo: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Update employee performance metrics if ticket was assigned
      if (ticket.assignedToId) {
        const performance = await tx.employeePerformanceMetrics.findUnique({
          where: { employeeId: ticket.assignedToId }
        });

        if (performance) {
          // Calculate new average rating
          const totalFeedbacks = await tx.ticketFeedback.count({
            where: {
              ticket: {
                assignedToId: ticket.assignedToId
              }
            }
          });

          const newAverage = ((performance.customerRating.toNumber() * (totalFeedbacks - 1)) + rating) / totalFeedbacks;

          await tx.employeePerformanceMetrics.update({
            where: { employeeId: ticket.assignedToId },
            data: {
              customerRating: newAverage,
              lastUpdated: new Date()
            }
          });
        } else {
          // Create performance record if doesn't exist
          await tx.employeePerformanceMetrics.create({
            data: {
              employeeId: ticket.assignedToId,
              customerRating: rating
            }
          });
        }
      }

      // Add feedback note to ticket
      await tx.ticketNote.create({
        data: {
          ticketId,
          createdById: user.employee!.id,
          content: `Customer feedback received: ${rating}/5 stars${comment ? `. Comment: ${comment}` : ''}`
        }
      });

      return feedback;
    });

    return json({ 
      success: true, 
      message: "Feedback submitted successfully",
      feedback: result 
    });

  } catch (error) {
    console.error("Error submitting feedback:", error);
    return json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}