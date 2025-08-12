import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { PermissionGate } from "~/components/permission-gate";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TicketAssignment } from "~/components/tickets/ticket-assignment";
import { TicketNotes } from "~/components/tickets/ticket-notes";
import { TicketStatusHistory } from "~/components/tickets/ticket-status-history";
import { ArrowLeft, Edit, User, Calendar, Clock, AlertCircle, CheckCircle, MessageSquare, Printer, UserPlus, Settings } from "lucide-react";
import { db } from "~/lib/db.server";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "read");

  const ticketId = params.id;
  if (!ticketId) {
    throw new Response("Ticket ID is required", { status: 400 });
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          location: true,
          package: {
            select: { name: true, speed: true }
          }
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          position: true,
          phone: true,
          role: true
        }
      },
      feedback: {
        select: {
          rating: true,
          comment: true,
          createdAt: true
        }
      }
    }
  });

  // Get available technicians for assignment
  const technicians = await db.employee.findMany({
    where: {
      canHandleTickets: true,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      role: true,
      handlingStatus: true,
      maxConcurrentTickets: true
    },
    orderBy: { name: 'asc' }
  });

  // Get current active ticket counts for each technician
  const techniciansWithCounts = await Promise.all(
    technicians.map(async (tech) => {
      const currentActiveTickets = await db.ticket.count({
        where: {
          assignedToId: tech.id,
          status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] }
        }
      });
      
      return {
        ...tech,
        currentActiveTickets
      };
    })
  );

  // Get available employees for assignment
  const employees = await Promise.all(
    techniciansWithCounts.map(async (tech) => ({
      ...tech,
      currentTicketCount: tech.currentActiveTickets,
      canHandleTickets: true,
      isActive: true
    }))
  );

  if (!ticket) {
    throw new Response("Ticket not found", { status: 404 });
  }

  return json({ user, ticket, employees });
}

export default function TicketDetail() {
  const { user, ticket, employees } = useLoaderData<typeof loader>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    window.location.reload();
  };

  // Priority badge variant
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  // Status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'destructive';
      case 'IN_PROGRESS': return 'default';
      case 'PENDING': return 'secondary';
      case 'RESOLVED': return 'outline';
      case 'CLOSED': return 'outline';
      default: return 'outline';
    }
  };

  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <AlertCircle className="h-4 w-4" />;
      case 'IN_PROGRESS': return <Clock className="h-4 w-4" />;
      case 'RESOLVED': return <CheckCircle className="h-4 w-4" />;
      case 'CLOSED': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title={ticket.title}
        description={`Tiket #${ticket.id.slice(-8).toUpperCase()}`}
      >
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>

          <PermissionGate user={user} resource="tickets" action="update">
            <TicketAssignment
              ticketId={ticket.id}
              currentAssignee={ticket.assignedTo ? {
                id: ticket.assignedTo.id,
                name: ticket.assignedTo.name
              } : null}
              employees={employees}
              onAssignmentChange={handleRefresh}
            />
          </PermissionGate>

          <Button variant="outline" asChild>
            <Link to="/tickets">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>

          <PermissionGate user={user} resource="tickets" action="update">
            <Button asChild>
              <Link to={`/tickets/${ticket.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </PermissionGate>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Tiket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(ticket.status)} className="flex items-center w-fit">
                      {getStatusIcon(ticket.status)}
                      <span className="ml-1">{ticket.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Prioritas</label>
                  <div className="mt-1">
                    <Badge variant={getPriorityVariant(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Kategori</label>
                  <p className="mt-1">
                    {ticket.category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Deskripsi</label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Dibuat</label>
                  <p className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                    {format(new Date(ticket.createdAt), "dd MMMM yyyy, HH:mm", { locale: id })}
                  </p>
                </div>
                {ticket.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Diselesaikan</label>
                    <p className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      {format(new Date(ticket.completedAt), "dd MMMM yyyy, HH:mm", { locale: id })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <TicketNotes
            key={`notes-${refreshKey}`}
            ticketId={ticket.id}
            currentUserId={user.employee!.id}
            currentUserRole={user.employee!.role}
          />

          {/* Status History */}
          <TicketStatusHistory
            key={`history-${refreshKey}`}
            ticketId={ticket.id}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Informasi Pelanggan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-lg">{ticket.customer.name}</p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <Link to={`/customers/${ticket.customer.id}`}>
                    Lihat Detail Pelanggan
                  </Link>
                </Button>
              </div>

              {ticket.customer.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p>{ticket.customer.email}</p>
                </div>
              )}

              {ticket.customer.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Telepon</label>
                  <p>{ticket.customer.phone}</p>
                </div>
              )}

              {ticket.customer.location && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Lokasi</label>
                  <p>{ticket.customer.location}</p>
                </div>
              )}

              {ticket.customer.package && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Paket</label>
                  <p>{ticket.customer.package.name} - {ticket.customer.package.speed}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned Technician */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Teknisi yang Ditugaskan</CardTitle>
                <PermissionGate user={user} resource="tickets" action="update">
                  <TicketAssignment
                    ticketId={ticket.id}
                    currentAssignee={ticket.assignedTo ? {
                      id: ticket.assignedTo.id,
                      name: ticket.assignedTo.name
                    } : null}
                    employees={employees}
                    onAssignmentChange={handleRefresh}
                    className="inline-block"
                  />
                </PermissionGate>
              </div>
            </CardHeader>
            <CardContent>
              {ticket.assignedTo ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{ticket.assignedTo.name}</p>
                    <p className="text-sm text-gray-500">{ticket.assignedTo.position}</p>
                  </div>

                  {ticket.assignedTo.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Telepon</label>
                      <p>{ticket.assignedTo.phone}</p>
                    </div>
                  )}


                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-500">Belum ditugaskan</p>

                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Feedback */}
          {ticket.feedback && (
            <Card>
              <CardHeader>
                <CardTitle>Feedback Pelanggan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Rating</label>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`text-lg ${i < ticket.feedback!.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                        ★
                      </span>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">({ticket.feedback.rating}/5)</span>
                  </div>
                </div>

                {ticket.feedback.comment && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Komentar</label>
                    <p className="text-gray-700">{ticket.feedback.comment}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Diberikan</label>
                  <p className="text-sm">
                    {format(new Date(ticket.feedback.createdAt), "dd MMM yyyy", { locale: id })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>



      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .bg-white {
            background-color: white !important;
          }
          .border {
            border: 1px solid #e5e7eb !important;
          }
          .shadow-sm {
            box-shadow: none !important;
          }
        }
      `}</style>
    </PageContainer>
  );
}