import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  UserCheck, 
  UserX,
  ArrowRight,
  BarChart3
} from "lucide-react";
import { db } from "~/lib/db.server";
import { cn } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "read");

  // Get all technicians with their workload
  const technicians = await db.employee.findMany({
    where: { 
      canHandleTickets: true,
      isActive: true 
    },
    include: {
      assignedTickets: {
        where: {
          status: {
            in: ['OPEN', 'IN_PROGRESS', 'PENDING']
          }
        },
        include: {
          customer: {
            select: { name: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      },
      performanceMetrics: {
        select: {
          totalTicketsResolved: true,
          averageResolutionTime: true,
          customerRating: true,
          ticketsResolvedThisMonth: true
        }
      },
      _count: {
        select: {
          assignedTickets: {
            where: {
              status: {
                in: ['OPEN', 'IN_PROGRESS', 'PENDING']
              }
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Get unassigned tickets
  const unassignedTickets = await db.ticket.findMany({
    where: {
      assignedToId: null,
      status: {
        in: ['OPEN', 'IN_PROGRESS', 'PENDING']
      }
    },
    include: {
      customer: {
        select: { name: true }
      }
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' }
    ]
  });

  // Calculate workload statistics
  const totalActiveTickets = await db.ticket.count({
    where: {
      status: {
        in: ['OPEN', 'IN_PROGRESS', 'PENDING']
      }
    }
  });

  const workloadStats = {
    totalTechnicians: technicians.length,
    availableTechnicians: technicians.filter(t => t.handlingStatus === 'AVAILABLE').length,
    busyTechnicians: technicians.filter(t => t.handlingStatus === 'BUSY').length,
    unavailableTechnicians: technicians.filter(t => t.handlingStatus === 'OFFLINE').length,
    totalActiveTickets,
    unassignedTickets: unassignedTickets.length,
    averageWorkload: technicians.length > 0 
      ? Math.round(totalActiveTickets / technicians.length * 100) / 100 
      : 0
  };

  return json({ 
    user, 
    technicians, 
    unassignedTickets, 
    workloadStats 
  });
}

export default function TicketWorkload() {
  const { user, technicians, unassignedTickets, workloadStats } = useLoaderData<typeof loader>();
  const assignFetcher = useFetcher();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'BUSY': return 'bg-yellow-100 text-yellow-800';
      case 'OFFLINE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <UserCheck className="h-4 w-4" />;
      case 'BUSY': return <Clock className="h-4 w-4" />;
      case 'OFFLINE': return <UserX className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-blue-600 bg-blue-50';
      case 'LOW': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const assignTicket = (ticketId: string, technicianId: string) => {
    assignFetcher.submit(
      { 
        assignedToId: technicianId,
        reason: "Assigned from workload management"
      },
      { 
        method: "post", 
        action: `/api/tickets/${ticketId}/assign` 
      }
    );
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Workload Management"
        description="Monitor technician workload and assign tickets efficiently"
      />

      {/* Workload Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Technicians</p>
                <p className="text-2xl font-bold text-gray-900">{workloadStats.totalTechnicians}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Available</p>
                <p className="text-2xl font-bold text-green-600">{workloadStats.availableTechnicians}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Unassigned Tickets</p>
                <p className="text-2xl font-bold text-red-600">{workloadStats.unassignedTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Avg Workload</p>
                <p className="text-2xl font-bold text-purple-600">{workloadStats.averageWorkload}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Technician Workload */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Technician Workload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {technicians.map((technician) => {
                  const workloadPercentage = (technician._count.assignedTickets / technician.maxConcurrentTickets) * 100;
                  
                  return (
                    <div key={technician.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="font-medium text-gray-900">{technician.name}</div>
                          <Badge className={cn("text-xs", getStatusColor(technician.handlingStatus))}>
                            {getStatusIcon(technician.handlingStatus)}
                            <span className="ml-1">{technician.handlingStatus}</span>
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {technician._count.assignedTickets} / {technician.maxConcurrentTickets} tickets
                        </div>
                      </div>

                      <div className="mb-3">
                        <Progress 
                          value={workloadPercentage} 
                          className={cn(
                            "h-2",
                            workloadPercentage >= 100 ? "bg-red-100" : 
                            workloadPercentage >= 80 ? "bg-yellow-100" : "bg-green-100"
                          )}
                        />
                      </div>

                      {/* Performance Metrics */}
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Resolved:</span> {technician.performanceMetrics?.totalTicketsResolved || 0}
                        </div>
                        <div>
                          <span className="font-medium">Avg Time:</span> {technician.performanceMetrics?.averageResolutionTime.toNumber().toFixed(1) || 0}h
                        </div>
                        <div>
                          <span className="font-medium">Rating:</span> {technician.performanceMetrics?.customerRating.toNumber().toFixed(1) || 0}/5
                        </div>
                      </div>

                      {/* Active Tickets */}
                      {technician.assignedTickets.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-700">Active Tickets:</div>
                          {technician.assignedTickets.slice(0, 3).map((ticket) => (
                            <div key={ticket.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                              <div className="flex items-center space-x-2">
                                <Badge className={cn("text-xs", getPriorityColor(ticket.priority))}>
                                  {ticket.priority}
                                </Badge>
                                <span className="truncate">{ticket.title}</span>
                              </div>
                              <span className="text-gray-500">{ticket.customer.name}</span>
                            </div>
                          ))}
                          {technician.assignedTickets.length > 3 && (
                            <div className="text-xs text-gray-500">+{technician.assignedTickets.length - 3} more tickets</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unassigned Tickets */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                Unassigned Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unassignedTickets.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-500">All tickets are assigned!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unassignedTickets.map((ticket) => (
                    <div key={ticket.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={cn("text-xs", getPriorityColor(ticket.priority))}>
                          {ticket.priority}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="font-medium text-sm mb-1">{ticket.title}</div>
                      <div className="text-xs text-gray-600 mb-3">{ticket.customer.name}</div>
                      
                      {/* Quick Assign Buttons */}
                      <div className="space-y-1">
                        {technicians
                          .filter(t => 
                            t.handlingStatus === 'AVAILABLE' && 
                            t._count.assignedTickets < t.maxConcurrentTickets
                          )
                          .slice(0, 2)
                          .map((technician) => (
                            <Button
                              key={technician.id}
                              variant="outline"
                              size="sm"
                              className="w-full text-xs h-7"
                              onClick={() => assignTicket(ticket.id, technician.id)}
                              disabled={assignFetcher.state === "submitting"}
                            >
                              <ArrowRight className="mr-1 h-3 w-3" />
                              Assign to {technician.name}
                            </Button>
                          ))}
                        
                        {technicians.filter(t => 
                          t.handlingStatus === 'AVAILABLE' && 
                          t._count.assignedTickets < t.maxConcurrentTickets
                        ).length === 0 && (
                          <div className="text-xs text-red-500 text-center py-2">
                            No available technicians
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}