import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { DataGrid, DataCard } from "~/components/ui/data-grid";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { 
  Users, 
  Star, 
  Clock,
  CheckCircle,
  TrendingUp,
  Award,
  AlertTriangle,
  RefreshCw,
  Download,
  User,
  Target,
  Activity
} from "lucide-react";

interface EmployeePerformanceReportProps {
  period?: string;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  className?: string;
}

export function EmployeePerformanceReport({
  period = "month",
  startDate,
  endDate,
  employeeId,
  className
}: EmployeePerformanceReportProps) {
  const [reportData, setReportData] = useState<any>(null);
  const reportFetcher = useFetcher();

  // Load report data
  const loadReport = () => {
    const params = new URLSearchParams();
    params.set("period", period);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (employeeId) params.set("employeeId", employeeId);
    
    reportFetcher.load(`/api/reports/employee-performance?${params.toString()}`);
  };

  // Initial load and reload on parameter change
  useEffect(() => {
    loadReport();
  }, [period, startDate, endDate, employeeId]);

  // Update report data when fetched
  useEffect(() => {
    if (reportFetcher.data && typeof reportFetcher.data === 'object' && !('error' in reportFetcher.data)) {
      setReportData(reportFetcher.data);
    }
  }, [reportFetcher.data]);

  const isLoading = reportFetcher.state === "loading";

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-700';
      case 'TECHNICIAN': return 'bg-blue-100 text-blue-700';
      case 'MARKETING': return 'bg-green-100 text-green-700';
      case 'HR': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isLoading && !reportData) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <RefreshCw className="h-8 w-8 animate-spin mr-3 text-blue-500" />
        <span className="text-lg text-gray-600">Loading performance report...</span>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Performance Data
        </h3>
        <p className="text-gray-600">
          No performance data available for the selected period.
        </p>
      </div>
    );
  }

  const { summary, employeePerformance, workloadDistribution, topPerformers, improvementNeeded } = reportData;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Performance Report</h2>
          <p className="text-gray-600">
            Team performance metrics and individual analysis
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={loadReport}
            disabled={isLoading}
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Team Summary */}
      <DataGrid columns={4} className="mb-8">
        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold">{summary.totalEmployees}</p>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Team Resolution Rate</p>
              <p className="text-2xl font-bold">{summary.teamResolutionRate.toFixed(1)}%</p>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Team Avg Rating</p>
              <p className="text-2xl font-bold">{summary.teamAvgRating}/5</p>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold">{summary.totalTickets}</p>
            </div>
          </div>
        </DataCard>
      </DataGrid>

      {/* Workload Distribution */}
      <DataCard title="Team Workload Distribution" className="mb-8">
        <DataGrid columns={3}>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{workloadDistribution.underutilized}</div>
            <div className="text-sm text-gray-600">Underutilized</div>
            <div className="text-xs text-gray-500">&lt; 50% capacity</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{workloadDistribution.optimal}</div>
            <div className="text-sm text-gray-600">Optimal Load</div>
            <div className="text-xs text-gray-500">50-80% capacity</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{workloadDistribution.overloaded}</div>
            <div className="text-sm text-gray-600">Overloaded</div>
            <div className="text-xs text-gray-500">&gt; 80% capacity</div>
          </div>
        </DataGrid>
      </DataCard>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <DataCard title="Top Performers" className="mb-8">
          <div className="space-y-4">
            {topPerformers.map((employee: any, index: number) => (
              <div key={employee.employee.id} className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Award className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{employee.employee.name}</span>
                      <Badge className={getRoleColor(employee.employee.role)}>
                        {employee.employee.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{employee.employee.division}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-green-600">{employee.metrics.resolutionRate}%</div>
                    <div className="text-gray-500">Resolution</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-yellow-600">{employee.metrics.avgRating}/5</div>
                    <div className="text-gray-500">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-600">{employee.metrics.totalTickets}</div>
                    <div className="text-gray-500">Tickets</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      )}

      {/* All Employee Performance */}
      <DataCard title="Individual Performance" className="mb-8">
        <div className="space-y-4">
          {employeePerformance.map((employee: any) => (
            <div key={employee.employee.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{employee.employee.name}</span>
                      <Badge className={getRoleColor(employee.employee.role)}>
                        {employee.employee.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{employee.employee.division}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-bold ${getPerformanceColor(employee.metrics.resolutionRate)}`}>
                    {employee.metrics.resolutionRate}%
                  </div>
                  <div className="text-xs text-gray-500">Performance Score</div>
                </div>
              </div>

              {/* Metrics Grid */}
              <DataGrid columns={4} className="mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold">{employee.metrics.totalTickets}</div>
                  <div className="text-xs text-gray-500">Total Tickets</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{employee.metrics.resolvedTickets}</div>
                  <div className="text-xs text-gray-500">Resolved</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{employee.metrics.avgRating}/5</div>
                  <div className="text-xs text-gray-500">Avg Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{employee.metrics.avgResolutionTime}h</div>
                  <div className="text-xs text-gray-500">Avg Time</div>
                </div>
              </DataGrid>

              {/* Workload */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Workload</span>
                  <span className={`text-sm font-bold ${getWorkloadColor(employee.metrics.workloadPercentage)}`}>
                    {employee.metrics.workloadPercentage}%
                  </span>
                </div>
                <Progress value={employee.metrics.workloadPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{employee.metrics.currentWorkload} active tickets</span>
                  <span>{employee.employee.maxConcurrentTickets} max capacity</span>
                </div>
              </div>

              {/* Priority Distribution */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="font-bold text-red-600">{employee.distributions.priority.URGENT}</div>
                  <div className="text-gray-500">Urgent</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded">
                  <div className="font-bold text-orange-600">{employee.distributions.priority.HIGH}</div>
                  <div className="text-gray-500">High</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="font-bold text-yellow-600">{employee.distributions.priority.MEDIUM}</div>
                  <div className="text-gray-500">Medium</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-bold text-green-600">{employee.distributions.priority.LOW}</div>
                  <div className="text-gray-500">Low</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DataCard>

      {/* Improvement Needed */}
      {improvementNeeded.length > 0 && (
        <DataCard title="Needs Improvement">
          <div className="space-y-3">
            {improvementNeeded.map((employee: any) => (
              <div key={employee.employee.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50 border-red-200">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <span className="font-medium">{employee.employee.name}</span>
                    <p className="text-sm text-gray-600">
                      {employee.metrics.resolutionRate < 70 && "Low resolution rate"} 
                      {employee.metrics.resolutionRate < 70 && employee.metrics.avgRating < 3.5 && " • "}
                      {employee.metrics.avgRating < 3.5 && "Low customer rating"}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-red-600 font-bold">{employee.metrics.resolutionRate}%</div>
                  <div className="text-red-600">{employee.metrics.avgRating}/5 ⭐</div>
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
}