import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { DataGrid, DataCard } from "~/components/ui/data-grid";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  User,
  RefreshCw
} from "lucide-react";

interface TicketAnalyticsData {
  summary: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    averageResolutionTime: number;
    period: string;
  };
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  monthlyTrends: Array<{
    month: string;
    totalTickets: number;
    resolvedTickets: number;
    averageResolutionTime: number;
  }>;
  employeePerformance: Array<{
    employeeId: string;
    employee: {
      name: string;
      role: string;
    };
    totalTickets: number;
    resolvedTickets: number;
    averageResolutionTime: number;
    resolutionRate: number;
  }>;
}

interface TicketAnalyticsReportProps {
  period?: string;
  className?: string;
}

export function TicketAnalyticsReport({ 
  period = "month", 
  className 
}: TicketAnalyticsReportProps) {
  const [data, setData] = useState<TicketAnalyticsData | null>(null);
  const analyticsFetcher = useFetcher();

  // Load analytics data
  useEffect(() => {
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    
    analyticsFetcher.load(`/api/reports/ticket-analytics?${params.toString()}`);
  }, [period]);

  // Update data when loaded
  useEffect(() => {
    if (analyticsFetcher.data && typeof analyticsFetcher.data === 'object' && !('error' in analyticsFetcher.data)) {
      setData(analyticsFetcher.data as TicketAnalyticsData);
    }
  }, [analyticsFetcher.data]);

  const refreshData = () => {
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    analyticsFetcher.load(`/api/reports/ticket-analytics?${params.toString()}`);
  };

  const isLoading = analyticsFetcher.state === "loading";

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
      case 'PENDING': return 'bg-orange-100 text-orange-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      case 'CLOSED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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

  if (isLoading && !data) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mr-3 text-blue-500" />
          <span className="text-lg text-gray-600">Loading ticket analytics...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={className}>
        <div className="text-center py-12">
          <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Ticket Data Available
          </h3>
          <p className="text-gray-600">
            Ticket analytics will appear here once tickets are created.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Ticket className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900">Ticket Analytics</h2>
        </div>
        <Button
          variant="outline"
          onClick={refreshData}
          disabled={isLoading}
          className="flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <DataGrid columns={4} className="mb-8">
        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Ticket className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold">{data.summary.totalTickets}</p>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Open Tickets</p>
              <p className="text-2xl font-bold">{data.summary.openTickets}</p>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold">{data.summary.resolvedTickets}</p>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Resolution</p>
              <p className="text-2xl font-bold">{data.summary.averageResolutionTime.toFixed(1)}h</p>
            </div>
          </div>
        </DataCard>
      </DataGrid>

      {/* Analytics Charts */}
      <DataGrid columns={2} className="gap-8 mb-8">
        {/* Status Breakdown */}
        <DataCard title="Status Breakdown">
          <div className="space-y-3">
            {Object.entries(data.statusBreakdown).map(([status, count]) => {
              const percentage = data.summary.totalTickets > 0 
                ? (count / data.summary.totalTickets) * 100 
                : 0;
              
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(status)}>
                      {status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>

        {/* Priority Breakdown */}
        <DataCard title="Priority Breakdown">
          <div className="space-y-3">
            {Object.entries(data.priorityBreakdown).map(([priority, count]) => {
              const percentage = data.summary.totalTickets > 0 
                ? (count / data.summary.totalTickets) * 100 
                : 0;
              
              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(priority)}>
                      {priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      </DataGrid>

      {/* Monthly Trends */}
      <DataCard title="Monthly Trends" className="mb-8">
        <div className="space-y-4">
          {data.monthlyTrends.map((trend) => (
            <div key={trend.month} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">
                  {new Date(trend.month + '-01').toLocaleDateString('id-ID', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-sm font-bold">{trend.totalTickets} tickets</div>
                  <div className="text-xs text-gray-500">{trend.resolvedTickets} resolved</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{trend.averageResolutionTime.toFixed(1)}h</div>
                  <div className="text-xs text-gray-500">avg resolution</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DataCard>

      {/* Employee Performance */}
      {data.employeePerformance.length > 0 && (
        <DataCard title="Employee Performance">
          <div className="space-y-4">
            {data.employeePerformance.slice(0, 5).map((emp) => (
              <div key={emp.employeeId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{emp.employee.name}</p>
                    <p className="text-xs text-gray-500">{emp.employee.role}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="text-sm font-bold">{emp.resolvedTickets}/{emp.totalTickets}</div>
                    <div className="text-xs text-gray-500">resolved</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{emp.resolutionRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">success rate</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{emp.averageResolutionTime.toFixed(1)}h</div>
                    <div className="text-xs text-gray-500">avg time</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
}