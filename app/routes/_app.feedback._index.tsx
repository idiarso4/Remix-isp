import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { useState, useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { FeedbackDisplay, FeedbackSummary } from "~/components/feedback/feedback-display";
import { DataGrid, DataCard } from "~/components/ui/data-grid";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { 
  Star, 
  TrendingUp, 
  Users, 
  MessageSquare,
  Filter,
  RefreshCw,
  Calendar
} from "lucide-react";
import { useFetcher } from "@remix-run/react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "read");

  return json({ user });
}

export default function FeedbackManagement() {
  const { user } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState<any>(null);
  
  const statsFetcher = useFetcher();
  
  const period = searchParams.get("period") || "all";
  const employeeId = searchParams.get("employeeId") || "";

  // Load feedback stats
  useEffect(() => {
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    if (employeeId) params.set("employeeId", employeeId);
    
    statsFetcher.load(`/api/feedback/stats?${params.toString()}`);
  }, [period, employeeId]);

  // Update stats when data is loaded
  useEffect(() => {
    if (statsFetcher.data && typeof statsFetcher.data === 'object' && !('error' in statsFetcher.data)) {
      setStats(statsFetcher.data);
    }
  }, [statsFetcher.data]);

  const handlePeriodChange = (newPeriod: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (newPeriod === "all") {
      newParams.delete("period");
    } else {
      newParams.set("period", newPeriod);
    }
    setSearchParams(newParams);
  };

  const refreshData = () => {
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    if (employeeId) params.set("employeeId", employeeId);
    
    statsFetcher.load(`/api/feedback/stats?${params.toString()}`);
  };

  const isLoading = statsFetcher.state === "loading";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Manajemen Feedback"
        description="Kelola dan analisis feedback pelanggan untuk meningkatkan kualitas layanan"
      >
        <div className="flex items-center space-x-3">
          {/* Period Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Waktu</option>
              <option value="month">Bulan Ini</option>
              <option value="week">Minggu Ini</option>
            </select>
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
      </PageHeader>

      {isLoading && !stats ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mr-3 text-blue-500" />
          <span className="text-lg text-gray-600">Memuat data feedback...</span>
        </div>
      ) : stats ? (
        <div className="space-y-8">
          {/* Summary Cards */}
          <DataGrid columns={4}>
            <DataCard>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Feedback</p>
                  <p className="text-2xl font-bold">{stats.summary.totalFeedbacks}</p>
                </div>
              </div>
            </DataCard>

            <DataCard>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rating Rata-rata</p>
                  <p className="text-2xl font-bold">{stats.summary.averageRating}/5</p>
                </div>
              </div>
            </DataCard>

            <DataCard>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rating Tinggi (4-5)</p>
                  <p className="text-2xl font-bold">
                    {stats.summary.ratingDistribution[4] + stats.summary.ratingDistribution[5]}
                  </p>
                </div>
              </div>
            </DataCard>

            <DataCard>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Teknisi Aktif</p>
                  <p className="text-2xl font-bold">{stats.employeePerformance.length}</p>
                </div>
              </div>
            </DataCard>
          </DataGrid>

          {/* Main Content */}
          <DataGrid columns={2} className="gap-8">
            {/* Feedback Summary */}
            <div>
              <FeedbackSummary
                totalFeedbacks={stats.summary.totalFeedbacks}
                averageRating={stats.summary.averageRating}
                ratingDistribution={stats.summary.ratingDistribution}
              />
            </div>

            {/* Monthly Trends */}
            <DataCard title="Tren Bulanan">
              <div className="space-y-4">
                {stats.monthlyTrends.map((trend: any) => (
                  <div key={trend.month} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {new Date(trend.month + '-01').toLocaleDateString('id-ID', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-xs">
                        {trend.totalFeedbacks} feedback
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">
                          {trend.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DataCard>
          </DataGrid>

          {/* Employee Performance */}
          {stats.employeePerformance.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Performa Teknisi
              </h2>
              <DataGrid columns={2} className="gap-6">
                {stats.employeePerformance.map((emp: any) => (
                  <DataCard key={emp.employeeId}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{emp.employee.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {emp.employee.role}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="font-bold text-lg">
                              {emp.averageRating.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {emp.totalFeedbacks} feedback
                          </p>
                        </div>
                      </div>

                      {/* Rating Distribution */}
                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((rating: number) => {
                          const count = emp.ratingDistribution[rating.toString()] || 0;
                          const percentage = emp.totalFeedbacks > 0 ? (count / emp.totalFeedbacks) * 100 : 0;
                          
                          return (
                            <div key={rating} className="flex items-center space-x-2">
                              <span className="text-xs w-4">{rating}</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-1">
                                <div
                                  className="bg-yellow-400 h-1 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 w-6 text-right">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </DataCard>
                ))}
              </DataGrid>
            </div>
          )}

          {/* Recent Feedback */}
          {stats.recentFeedback.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Feedback Terbaru
              </h2>
              <div className="space-y-4">
                {stats.recentFeedback.slice(0, 5).map((feedback: any) => (
                  <FeedbackDisplay
                    key={feedback.id}
                    feedback={{
                      ...feedback,
                      customer: {
                        id: feedback.ticket.customer,
                        name: feedback.ticket.customer,
                        email: undefined
                      },
                      ticket: {
                        id: feedback.ticket.id,
                        title: feedback.ticket.title,
                        assignedTo: feedback.ticket.assignedTo
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Belum Ada Data Feedback
          </h3>
          <p className="text-gray-600">
            Feedback akan muncul setelah pelanggan memberikan rating untuk tiket yang telah diselesaikan.
          </p>
        </div>
      )}
    </PageContainer>
  );
}