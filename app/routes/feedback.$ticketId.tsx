import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { FeedbackForm } from "~/components/feedback/feedback-form";
import { FeedbackDisplay } from "~/components/feedback/feedback-display";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { 
  CheckCircle, 
  MessageSquare,
  Ticket as TicketIcon
} from "lucide-react";

const feedbackSchema = z.object({
  rating: z.coerce.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().optional()
});

export async function loader({ params }: LoaderFunctionArgs) {
  const ticketId = params.ticketId;
  if (!ticketId) {
    throw new Response("Ticket ID is required", { status: 400 });
  }

  try {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
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
            position: true
          }
        },
        feedback: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      throw new Response("Ticket not found", { status: 404 });
    }

    // Only allow feedback for resolved or closed tickets
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new Response("Feedback can only be provided for resolved or closed tickets", { status: 400 });
    }

    return json({ ticket });
  } catch (error) {
    console.error("Error loading ticket for feedback:", error);
    throw new Response("Failed to load ticket", { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const ticketId = params.ticketId;
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
    await db.$transaction(async (tx) => {
      // Create feedback
      await tx.ticketFeedback.create({
        data: {
          ticketId,
          customerId: ticket.customerId,
          rating,
          comment: comment || null
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
    });

    return redirect(`/feedback/${ticketId}?success=true`);

  } catch (error) {
    console.error("Error submitting feedback:", error);
    return json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

export default function FeedbackPage() {
  const { ticket } = useLoaderData<typeof loader>();
  const url = new URL(typeof window !== 'undefined' ? window.location.href : 'http://localhost');
  const success = url.searchParams.get('success') === 'true';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Service Feedback
          </h1>
          <p className="text-gray-600">
            Help us improve our service by sharing your experience
          </p>
        </div>

        {/* Ticket Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TicketIcon className="mr-2 h-5 w-5" />
              Ticket Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">{ticket.title}</h3>
              <p className="text-sm text-gray-600 mt-1">
                Ticket ID: {ticket.id.slice(-8).toUpperCase()}
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
              </div>
              
              {ticket.assignedTo && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Handled by</p>
                  <p className="font-medium">{ticket.assignedTo.name}</p>
                  {ticket.assignedTo.position && (
                    <p className="text-sm text-gray-500">{ticket.assignedTo.position}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feedback Form or Success Message */}
        {success || ticket.feedback ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Thank You!
              </h2>
              <p className="text-gray-600 mb-6">
                Your feedback has been submitted successfully. We appreciate you taking the time to help us improve our service.
              </p>
              
              {ticket.feedback && (
                <div className="mt-8">
                  <FeedbackDisplay 
                    feedback={ticket.feedback}
                    showTicketInfo={false}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <FeedbackForm
            ticketId={ticket.id}
            ticketTitle={ticket.title}
            technicianName={ticket.assignedTo?.name}
            onSubmitSuccess={() => {
              window.location.href = `/feedback/${ticket.id}?success=true`;
            }}
          />
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>This feedback form is secure and your information is protected.</p>
        </div>
      </div>
    </div>
  );
}