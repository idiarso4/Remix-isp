import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/lib/db.server";
import { FeedbackForm } from "~/components/feedback/feedback-form";
import { FeedbackDisplay } from "~/components/feedback/feedback-display";
import { PageContainer } from "~/components/layout/page-container";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { CheckCircle, AlertCircle, Wifi } from "lucide-react";

export async function loader({ params }: LoaderFunctionArgs) {
  const ticketId = params.ticketId;
  
  if (!ticketId) {
    throw new Response("Ticket ID is required", { status: 400 });
  }

  try {
    // Get ticket with customer and feedback info
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
            name: true
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

    // Check if ticket is resolved or closed
    const canProvideFeedback = ['RESOLVED', 'CLOSED'].includes(ticket.status);

    return json({ 
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        customer: ticket.customer,
        assignedTo: ticket.assignedTo,
        feedback: ticket.feedback ? {
          id: ticket.feedback.id,
          rating: ticket.feedback.rating,
          comment: ticket.feedback.comment,
          createdAt: ticket.feedback.createdAt.toISOString(),
          customer: ticket.feedback.customer,
          ticket: {
            id: ticket.id,
            title: ticket.title,
            assignedTo: ticket.assignedTo
          }
        } : null
      },
      canProvideFeedback
    });

  } catch (error) {
    console.error("Error loading ticket for feedback:", error);
    throw new Response("Failed to load ticket", { status: 500 });
  }
}

export default function PublicFeedbackPage() {
  const { ticket, canProvideFeedback } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <Wifi className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ISP Management System
              </h1>
              <p className="text-gray-600">Customer Feedback</p>
            </div>
          </div>
        </div>
      </header>

      <PageContainer className="py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Ticket Info */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Informasi Tiket
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">ID Tiket</label>
                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {ticket.id.slice(-8).toUpperCase()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-sm">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    ticket.status === 'RESOLVED' 
                      ? 'bg-green-100 text-green-700'
                      : ticket.status === 'CLOSED'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {ticket.status}
                  </span>
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500">Judul Tiket</label>
                <p className="text-gray-900">{ticket.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Pelanggan</label>
                <p className="text-gray-900">{ticket.customer.name}</p>
              </div>
              {ticket.assignedTo && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Ditangani oleh</label>
                  <p className="text-gray-900">{ticket.assignedTo.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Section */}
          {ticket.feedback ? (
            // Show existing feedback
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Feedback Anda
              </h2>
              <FeedbackDisplay
                feedback={{
                  ...ticket.feedback,
                  customer: {
                    id: ticket.feedback.customer.id,
                    name: ticket.feedback.customer.name,
                    email: ticket.feedback.customer.email || undefined
                  },
                  ticket: {
                    id: ticket.feedback.ticket.id,
                    title: ticket.feedback.ticket.title,
                    assignedTo: ticket.feedback.ticket.assignedTo || undefined
                  }
                }}
                showTicketInfo={false}
                showCustomerInfo={false}
              />
            </div>
          ) : canProvideFeedback ? (
            // Show feedback form
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Berikan Feedback
              </h2>
              <FeedbackForm
                ticketId={ticket.id}
                ticketTitle={ticket.title}
                customerName={ticket.customer.name}
                technicianName={ticket.assignedTo?.name}
              />
            </div>
          ) : (
            // Show message that feedback is not available yet
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Feedback hanya dapat diberikan setelah tiket diselesaikan atau ditutup.
                Status tiket saat ini: <strong>{ticket.status}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Thank you message */}
          {ticket.feedback && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Terima kasih telah memberikan feedback! Masukan Anda sangat berharga 
                untuk meningkatkan kualitas layanan kami.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </PageContainer>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>&copy; 2024 ISP Management System. All rights reserved.</p>
            <p className="mt-1">
              Jika Anda memiliki pertanyaan, silakan hubungi customer service kami.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}