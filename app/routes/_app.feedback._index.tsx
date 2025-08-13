import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useNavigate } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { SearchFilter, type FilterOption } from "~/components/ui/search-filter";
import { FeedbackDisplay } from "~/components/feedback/feedback-display";
import { 
  MessageSquare, 
  Star, 
  TrendingUp, 
  Users,
  BarChart3,
  Printer
} from "lucide-react";
import { db } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "read");

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const rating = url.searchParams.get("rating");
  const technician = url.searchParams.get("technician");

  const where: any = {};
  
  if (search) {
    where.OR = [
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { ticket: { title: { contains: search, mode: "insensitive" } } },
      { comment: { contains: search, mode: "insensitive" } }
    ];
  }
  
  if (rating && rating !== "all") {
    where.rating = parseInt(rating);
  }
  
  if (technician && technician !== "all") {
    where.ticket = {
      assignedToId: technician
    };
  }

  const [feedbacks, technicians, stats] = await Promise.all([
    db.ticketFeedback.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        ticket: {
          select: {
            id: true,
            title: true,
            assignedTo: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    db.employee.findMany({
      where: { 
        canHandleTickets: true,
        isActive: true 
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    // Calculate feedback statistics
    db.ticketFeedback.aggregate({
      _avg: { rating: true },
      _count: { rating: true }
    })
  ]);

  // Calculate rating distribution
  const ratingDistribution = await db.ticketFeedback.groupBy({
    by: ['rating'],
    _count: { rating: true },
    orderBy: { rating: 'asc' }
  });

  const feedbackStats = {
    totalFeedbacks: stats._count.rating || 0,
    averageRating: stats._avg.rating?.toNumber() || 0,
    ratingDistribution: ratingDistribution.map(item => ({
      rating: item.rating,
      count: item._count.rating
    }))
  };

  return json({ 
    user, 
    feedbacks, 
    technicians, 
    feedbackStats 
  });
}

export default function FeedbackIndex() {
  const { user, feedbacks, technicians, feedbackStats } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filter options
  const filterOptions: FilterOption[] = [
    {
      key: 'rating',
      label: 'Rating',
      type: 'select',
      options: [
        { value: 'all', label: 'All Ratings' },
        { value: '5', label: '5 Stars' },
        { value: '4', label: '4 Stars' },
        { value: '3', label: '3 Stars' },
        { value: '2', label: '2 Stars' },
        { value: '1', label: '1 Star' }
      ]
    },
    {
      key: 'technician',
      label: 'Technician',
      type: 'select',
      options: [
        { value: 'all', label: 'All Technicians' },
        ...technicians.map(tech => ({ value: tech.id, label: tech.name }))
      ]
    }
  ];

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Customer Feedback"
        description="Monitor customer satisfaction and service quality"
      >
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>
      </PageHeader>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Feedback</p>
                <p className="text-2xl font-bold text-gray-900">{feedbackStats.totalFeedbacks}</p>
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
                <p className={`text-2xl font-bold ${getRatingColor(feedbackStats.averageRating)}`}>
                  {feedbackStats.averageRating.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Satisfaction Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {feedbackStats.totalFeedbacks > 0 
                    ? Math.round((feedbackStats.ratingDistribution.filter(r => r.rating >= 4).reduce((sum, r) => sum + r.count, 0) / feedbackStats.totalFeedbacks) * 100)
                    : 0}%
                </p>
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
                <p className="text-sm font-medium text-gray-500">Response Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {/* This would need to be calculated based on resolved tickets vs feedback received */}
                  85%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const ratingData = feedbackStats.ratingDistribution.find(r => r.rating === rating);
              const count = ratingData?.count || 0;
              const percentage = feedbackStats.totalFeedbacks > 0 ? (count / feedbackStats.totalFeedbacks) * 100 : 0;
              
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

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchFilter
            searchPlaceholder="Search feedback..."
            filters={filterOptions}
            className="mb-6 print:hidden"
            searchValue={searchParams.get('search') || ''}
            filterValues={{
              rating: searchParams.get('rating') || '',
              technician: searchParams.get('technician') || ''
            }}
            onSearchChange={(value) => {
              const newSearchParams = new URLSearchParams(searchParams);
              if (value) {
                newSearchParams.set('search', value);
              } else {
                newSearchParams.delete('search');
              }
              navigate(`?${newSearchParams.toString()}`);
            }}
            onFilterChange={(key, value) => {
              const newSearchParams = new URLSearchParams(searchParams);
              if (value && value !== 'all') {
                newSearchParams.set(key, value);
              } else {
                newSearchParams.delete(key);
              }
              navigate(`?${newSearchParams.toString()}`);
            }}
            onClearFilters={() => {
              navigate('/feedback');
            }}
          />

          {feedbacks.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback found</h3>
              <p className="text-gray-500">No customer feedback matches your current filters.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {feedbacks.map((feedback) => (
                <FeedbackDisplay
                  key={feedback.id}
                  feedback={feedback}
                  showTicketInfo={true}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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