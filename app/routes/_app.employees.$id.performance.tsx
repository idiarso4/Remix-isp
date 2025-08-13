import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { FeedbackDisplay } from "~/components/feedback/feedback-display";
import { 
  ArrowLeft,
  Star, 
  TrendingUp, 
  Clock,
  CheckCircle,
  MessageSquare,
  Award,
  Target
} from "lucide-react";
import { db } from "~/lib/db.server";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "employees", "read");

  const employeeId = params.id;
  if (!employeeId) {
    throw new Response("Employee ID is required", { status: 400 });
  }

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      performanceMetrics: true,
      assignedTickets: {
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          feedback: { isNot: null }
        },
        include: {
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
        },
        orderBy: { completedAt: 'desc' },
        take: 10
      }
    }
  });

  if (!employee) {
    throw new Response("Employee not found", { status: 404 });
  }

  // Get detailed feedback statistics
  const feedbackStats = await db.ticketFeedback.aggregate({
    where: {
      ticket: {
        assignedToId: employeeId
      }
    },
    _avg: { rating: true },
    _count: { rating: true }
  });

  // Get rating distribution
  const ratingDistribution = await db.ticketFeedback.groupBy({
    by: ['rating'],
    where: {
      ticket: {
        assignedToId: employeeId
      }
    },
    _count: { rating: true },
    orderBy: { rating: 'desc' }
  });

  // Get monthly performance data (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyPerformance = await db.ticketFeedback.findMany({
    where: {
      ticket: {
        assignedToId: employeeId
      },
      createdAt: {
        gte: sixMonthsAgo
      }
    },
    select: {
      rating: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  // Group by month
  const monthlyStats = monthlyPerformance.reduce((acc, feedback) => {
    const month = format(new Date(feedback.createdAt), 'yyyy-MM');
    if (!acc[month]) {
      acc[month] = { ratings: [], count: 0 };
    }
    acc[month].ratings.push(feedback.rating);
    acc[month].count++;
    return acc;
  }, {} as Record<string, { ratings: number[], count: number }>);

  const performanceData = {
    totalFeedbacks: feedbackStats._count.rating || 0,
    averageRating: feedbackStats._avg.rating?.toNumber() || 0,
    ratingDistribution: ratingDistribution.map(item => ({
      rating: item.rating,
      count: item._count.rating
    })),
    monthlyStats: Object.entries(monthlyStats).map(([month, data]) => ({
      month,
      averageRating: data.ratings.reduce((sum, rating) => sum + rating, 0) / data.ratings.length,
      count: data.count
    }))
  };

  return json({ 
    user, 
    employee, 
    performanceData 
  });
}

export default function EmployeePerformance() {
  const { user, employee, performanceData } = useLoaderData<typeof loader>();

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 4) return "text-green-500";
    if (rating >= 3.5) return "text-yellow-600";
    if (rating >= 3) return "text-yellow-500";
    return "text-red-600";
  };

  const getPerformanceLevel = (rating: number) => {
    if (rating >= 4.5) return { level: "Excellent", color: "bg-green-100 text-green-800" };
    if (rating >= 4) return { level: "Good", color: "bg-green-100 text-green-700" };
    if (rating >= 3.5) return { level: "Satisfactory", color: "bg-yellow-100 text-yellow-800" };
    if (rating >= 3) return { level: "Needs Improvement", color: "bg-yellow-100 text-yellow-700" };
    return { level: "Poor", color: "bg-red-100 text-red-800" };
  };

  const performance = getPerformanceLevel(performanceData.averageRating);

  return (
    <PageContainer className="py-8">
      <PageHeader
        title={`${employee.name} - Performance`}
        description="Customer feedback and performance metrics"
      >
        <div className="flex items-center space-x-3">
          <Button variant="outline" asChild>
            <Link to={`/employees/${employee.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Feedback</p>
                <p className="text-2xl font-bold text-gray-900">{performanceData.totalFeedbacks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                <p className={`text-2xl font-bold ${getRatingColor(performanceData.averageRating)}`}>
                  {performanceData.averageRating.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Tickets Resolved</p>
                <p className="text-2xl font-bold text-green-600">
                  {employee.performanceMetrics?.totalTicketsResolved || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Avg Resolution Time</p>
                <p className="text-2xl font-bold text-purple-600">
                  {employee.performanceMetrics?.averageResolutionTime.toNumber().toFixed(1) || 0}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Level */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="mr-2 h-5 w-5" />
            Performance Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge className={performance.color} size="lg">
                {performance.level}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">
                Based on {performanceData.totalFeedbacks} customer feedback responses
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 ${
                      star <= Math.round(performanceData.averageRating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {performanceData.averageRating.toFixed(1)} out of 5.0
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rating Distribution */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const ratingData = performanceData.ratingDistribution.find(r => r.rating === rating);
              const count = ratingData?.count || 0;
              const percentage = performanceData.totalFeedbacks > 0 ? (count / performanceData.totalFeedbacks) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 w-20">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 w-16 text-right">
                    {count} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Customer Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {employee.assignedTickets.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback yet</h3>
              <p className="text-gray-500">This employee hasn't received any customer feedback yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {employee.assignedTickets.map((ticket) => (
                ticket.feedback && (
                  <FeedbackDisplay
                    key={ticket.id}
                    feedback={{
                      ...ticket.feedback,
                      ticket: {
                        id: ticket.id,
                        title: ticket.title
                      }
                    }}
                    showTicketInfo={true}
                  />
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}