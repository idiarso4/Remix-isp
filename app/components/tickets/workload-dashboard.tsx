import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Button } from "~/components/ui/button";
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  User,
  Ticket,
  TrendingUp,
  Loader2
} from "lucide-react";
import { DataGrid, DataCard } from "~/components/ui/data-grid";

interface Technician {
  id: string;
  name: string;
  role: string;
  division: string;
  handlingStatus: string;
  activeTickets: number;
  maxConcurrentTickets: number;
  workloadPercentage: number;
  availableSlots: number;
  canTakeMoreTickets: boolean;
  tickets: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    customerName: string;
    createdAt: string;
  }>;
  performance?: {
    totalResolved: number;
    averageResolutionTime: number;
    customerRating: number;
    resolvedThisMonth: number;
  };
}

interface WorkloadDashboardProps {
  className?: string;
}

export function WorkloadDashboard({ className }: WorkloadDashboardProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const workloadFetcher = useFetcher();

  // Load workload data on mount
  useEffect(() => {
    workloadFetcher.load("/api/technicians/workload");
  }, []);

  // Update technicians when data is loaded
  useEffect(() => {
    if (workloadFetcher.data && typeof workloadFetcher.data === 'object' && 'technicians' in workloadFetcher.data) {
      setTechnicians(workloadFetcher.data.technicians as Technician[]);
    }
  }, [workloadFetcher.data]);

  const refreshData = () => {
    workloadFetcher.load("/api/technicians/workload");
  };

  const isLoading = workloadFetcher.state === "loading";

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-700';
      case 'BUSY': return 'bg-yellow-100 text-yellow-700';
      case 'OFFLINE': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'LOW': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
      case 'PENDING': return 'bg-orange-100 text-orange-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      case 'CLOSED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Calculate summary stats
  const totalTechnicians = technicians.length;
  const availableTechnicians = technicians.filter(t => t.canTakeMoreTickets).length;
  const totalActiveTickets = technicians.reduce((sum, t) => sum + t.activeTickets, 0);
  const averageWorkload = totalTechnicians > 0 
    ? technicians.reduce((sum, t) => sum + t.workloadPercentage, 0) / totalTechnicians 
    : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-gray-500" />
          <h2 className="text-2xl font-bold">Technician Workload</h2>
        </div>
        <Button
          variant="outline"
          onClick={refreshData}
          disabled={isLoading}
          className="flex items-center"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <TrendingUp className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <DataGrid columns={4} className="mb-8">
        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Technicians</p>
              <p className="text-2xl font-bold">{totalTechnicians}</p>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold">{availableTechnicians}</p>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Ticket className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Tickets</p>
              <p className="text-2xl font-bold">{totalActiveTickets}</p>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Workload</p>
              <p className="text-2xl font-bold">{averageWorkload.toFixed(0)}%</p>
            </div>
          </div>
        </DataCard>
      </DataGrid>

      {/* Technician Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          Loading workload data...
        </div>
      ) : (
        <DataGrid columns={2} className="gap-6">
          {technicians.map((technician) => (
            <DataCard key={technician.id} className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{technician.name}</h3>
                      <p className="text-sm text-gray-600">{technician.division}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(technician.handlingStatus)}>
                    {technician.handlingStatus}
                  </Badge>
                </div>

                {/* Workload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Workload</span>
                    <span className={`text-sm font-bold ${getWorkloadColor(technician.workloadPercentage)}`}>
                      {technician.workloadPercentage}%
                    </span>
                  </div>
                  <Progress value={technician.workloadPercentage} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{technician.activeTickets}/{technician.maxConcurrentTickets} tickets</span>
                    <span>{technician.availableSlots} slots available</span>
                  </div>
                </div>

                {/* Performance */}
                {technician.performance && (
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">
                        {technician.performance.totalResolved}
                      </p>
                      <p className="text-xs text-gray-500">Total Resolved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">
                        {technician.performance.resolvedThisMonth}
                      </p>
                      <p className="text-xs text-gray-500">This Month</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-600">
                        {technician.performance.averageResolutionTime.toFixed(1)}h
                      </p>
                      <p className="text-xs text-gray-500">Avg Time</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-yellow-600">
                        {technician.performance.customerRating.toFixed(1)}/5
                      </p>
                      <p className="text-xs text-gray-500">Rating</p>
                    </div>
                  </div>
                )}

                {/* Active Tickets */}
                {technician.tickets.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <h4 className="text-sm font-medium mb-2">Active Tickets</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {technician.tickets.slice(0, 3).map((ticket) => (
                        <div key={ticket.id} className="flex items-center justify-between text-xs">
                          <div className="flex-1 truncate">
                            <span className="font-medium">{ticket.title}</span>
                            <span className="text-gray-500 ml-1">- {ticket.customerName}</span>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <Badge className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </Badge>
                            <Badge className={`text-xs ${getTicketStatusColor(ticket.status)}`}>
                              {ticket.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {technician.tickets.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{technician.tickets.length - 3} more tickets
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Indicator */}
                <div className="flex items-center justify-center pt-2">
                  {technician.canTakeMoreTickets ? (
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Available for new tickets
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600 text-sm">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      At capacity
                    </div>
                  )}
                </div>
              </div>
            </DataCard>
          ))}
        </DataGrid>
      )}
    </div>
  );
}