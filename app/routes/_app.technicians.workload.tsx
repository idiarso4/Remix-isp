import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Progress } from "~/components/ui/progress";
import { Users, Clock, AlertCircle, CheckCircle, UserCheck } from "lucide-react";
import { db } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "read");

  const [technicians, unassignedTickets] = await Promise.all([
    db.employee.findMany({
      where: { 
        canHandleTickets: true, 
        isActive: true 
      },
      include: {
        assignedTickets: {
          where: {
            status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] }
          },
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            createdAt: true,
            customer: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        performanceMetrics: {
          select: {
            totalTicketsResolved: true,
            averageResolutionTime: true,
            customerRating: true
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    db.ticket.findMany({
      where: {
        assignedToId: null,
        status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] }
      },
      include: {
        customer: {
          select: { name: true, location: true }
        }
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "asc" }
      ]
    })
  ]);

  return json({ user, technicians, unassignedTickets });
}

export default function TechnicianWorkload() {
  const { user, technicians, unassignedTickets } = useLoaderData<typeof loader>();
  const assignFetcher = useFetcher();

  const handleAssignTicket = (ticketId: string, technicianId: string) => {
    assignFetcher.submit(
      {
        ticketId,
        assignedToId: technicianId,
        reason: "Assigned via workload management"
      },
      {
        method: "post",
        action: "/api/ticket-assignment"
      }
    );
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'default';
      case 'BUSY': return 'secondary';
      case 'OFFLINE': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Manajemen Beban Kerja Teknisi"
        description="Kelola penugasan tiket dan beban kerja teknisi"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technician Workload */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Beban Kerja Teknisi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {technicians.map((tech) => {
                const workloadPercentage = (tech.currentTicketCount / tech.maxConcurrentTickets) * 100;
                const isOverloaded = tech.currentTicketCount >= tech.maxConcurrentTickets;
                
                return (
                  <div key={tech.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{tech.name}</h3>
                        <p className="text-sm text-gray-500">{tech.position}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusVariant(tech.handlingStatus)}>
                          {tech.handlingStatus}
                        </Badge>
                        <span className="text-sm font-medium">
                          {tech.currentTicketCount}/{tech.maxConcurrentTickets}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Beban Kerja</span>
                        <span>{Math.round(workloadPercentage)}%</span>
                      </div>
                      <Progress 
                        value={workloadPercentage} 
                        className={`h-2 ${isOverloaded ? 'bg-red-100' : ''}`}
                      />
                    </div>

                    {tech.performanceMetrics && (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Total Selesai</span>
                          <p className="font-medium">{tech.performanceMetrics.totalTicketsResolved}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Rata-rata Waktu</span>
                          <p className="font-medium">{tech.performanceMetrics.averageResolutionTime.toFixed(1)}h</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Rating</span>
                          <p className="font-medium">{tech.performanceMetrics.customerRating.toFixed(1)}/5</p>
                        </div>
                      </div>
                    )}

                    {tech.assignedTickets.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Tiket Aktif:</h4>
                        <div className="space-y-2">
                          {tech.assignedTickets.slice(0, 3).map((ticket) => (
                            <div key={ticket.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                              <div>
                                <span className="font-medium">{ticket.title}</span>
                                <span className="text-gray-500 ml-2">• {ticket.customer.name}</span>
                              </div>
                              <Badge variant={getPriorityVariant(ticket.priority)} size="sm">
                                {ticket.priority}
                              </Badge>
                            </div>
                          ))}
                          {tech.assignedTickets.length > 3 && (
                            <p className="text-xs text-gray-500">
                              +{tech.assignedTickets.length - 3} tiket lainnya
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Unassigned Tickets */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  Tiket Belum Ditugaskan
                </span>
                <Badge variant="destructive">{unassignedTickets.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unassignedTickets.length > 0 ? (
                <div className="space-y-4">
                  {unassignedTickets.map((ticket) => (
                    <div key={ticket.id} className="border rounded-lg p-3">
                      <div className="mb-2">
                        <h4 className="font-medium text-sm">{ticket.title}</h4>
                        <p className="text-xs text-gray-500">
                          {ticket.customer.name} • {ticket.customer.location}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant={getPriorityVariant(ticket.priority)} size="sm">
                          {ticket.priority}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(ticket.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Select
                          onValueChange={(techId) => handleAssignTicket(ticket.id, techId)}
                          disabled={assignFetcher.state === "submitting"}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Tugaskan ke..." />
                          </SelectTrigger>
                          <SelectContent>
                            {technicians
                              .filter(tech => 
                                tech.handlingStatus !== "OFFLINE" && 
                                tech.currentTicketCount < tech.maxConcurrentTickets
                              )
                              .map((tech) => (
                                <SelectItem key={tech.id} value={tech.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{tech.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      {tech.currentTicketCount}/{tech.maxConcurrentTickets}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Semua tiket sudah ditugaskan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}