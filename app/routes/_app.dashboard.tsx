import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { db } from "~/lib/db.server";
import { DatabaseOptimizer } from "~/lib/db-optimization.server";
import { withQueryTracking } from "~/lib/performance-monitor.server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { StatsCard, iconVariants } from "~/components/ui/stats-card";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { DataGrid, DataCard } from "~/components/ui/data-grid";
import {
  Users,
  Package,
  Ticket,
  UserCheck,
  BarChart3,
  Activity,
  Shield,
  Zap,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Star
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export const meta: MetaFunction = () => {
  return [
    { title: "Dashboard - ISP Management System" },
    { name: "description", content: "Dashboard ISP Management System" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, 'dashboard', 'read');

  try {
    // Use optimized dashboard stats with caching
    const dashboardStats = await withQueryTracking('dashboard-stats', () =>
      DatabaseOptimizer.getDashboardStats()
    );

    // Get additional data for recent activities
    const [recentTickets, recentCustomers, topEmployees] = await Promise.all([
      withQueryTracking('recent-tickets', () =>
        DatabaseOptimizer.getTicketsOptimized({ limit: 5 })
      ),
      withQueryTracking('recent-customers', () =>
        DatabaseOptimizer.getCustomersOptimized({ limit: 5 })
      ),
      withQueryTracking('top-employees', () =>
        DatabaseOptimizer.getEmployeePerformanceOptimized()
      )
    ]);

    // Legacy data fetching for compatibility (can be removed later)
    const [customers, tickets, employees, packages, payments, feedback] = await Promise.all([
      db.customer.findMany({
        include: {
          package: true,
          _count: {
            select: {
              tickets: true,
              payments: true
            }
          }
        }
      }),
      db.ticket.findMany({
        include: {
          customer: { select: { name: true } },
          assignedTo: { select: { name: true } }
        }
      }),
      db.employee.findMany({
        include: {
          performanceMetrics: true,
          _count: {
            select: {
              assignedTickets: {
                where: {
                  status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] }
                }
              }
            }
          }
        }
      }),
      db.package.findMany({
        include: {
          _count: { select: { customers: true } }
        }
      }),
      db.payment.findMany({
        include: { customer: { select: { name: true } } }
      }),
      db.ticketFeedback.findMany({
        include: {
          customer: { select: { name: true } },
          ticket: {
            include: {
              assignedTo: { select: { name: true } }
            }
          }
        }
      })
    ]);

    // Calculate statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    // Customer statistics
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'ACTIVE').length;
    const newCustomersThisMonth = customers.filter(c =>
      new Date(c.createdAt) >= startOfMonth
    ).length;

    // Ticket statistics
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => ['OPEN', 'IN_PROGRESS', 'PENDING'].includes(t.status)).length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;
    const closedTickets = tickets.filter(t => t.status === 'CLOSED').length;
    const urgentTickets = tickets.filter(t => t.priority === 'URGENT' && ['OPEN', 'IN_PROGRESS'].includes(t.status)).length;

    // Employee statistics
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.isActive).length;
    const availableTechnicians = employees.filter(e =>
      e.canHandleTickets && e.handlingStatus === 'AVAILABLE'
    ).length;

    // Payment statistics
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const monthlyRevenue = payments
      .filter(p => new Date(p.paymentDate) >= startOfMonth)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingPayments = payments.filter(p => p.status === 'PENDING').length;
    const overduePayments = payments.filter(p => p.status === 'OVERDUE').length;

    // Package statistics
    const totalPackages = packages.length;
    const mostPopularPackage = packages.reduce((prev, current) =>
      (prev._count.customers > current._count.customers) ? prev : current
    );

    // Feedback statistics
    const totalFeedback = feedback.length;
    const averageRating = totalFeedback > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0;

    // Use optimized recent activities data
    const recentActivities = {
      tickets: recentTickets,
      customers: recentCustomers
    };

    // Growth trends (last 6 months)
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthCustomers = customers.filter(c => {
        const createdAt = new Date(c.createdAt);
        return createdAt >= date && createdAt < nextDate;
      }).length;

      const monthTickets = tickets.filter(t => {
        const createdAt = new Date(t.createdAt);
        return createdAt >= date && createdAt < nextDate;
      }).length;

      const monthRevenue = payments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        return paymentDate >= date && paymentDate < nextDate;
      }).reduce((sum, p) => sum + Number(p.amount), 0);

      monthlyGrowth.push({
        month: format(date, 'MMM yyyy', { locale: id }),
        customers: monthCustomers,
        tickets: monthTickets,
        revenue: monthRevenue
      });
    }

    // Use optimized top employees data
    const analytics = {
      monthlyGrowth,
      topEmployees
    };

    return json({
      user,
      stats: {
        customers: {
          total: totalCustomers,
          active: activeCustomers,
          newThisMonth: newCustomersThisMonth
        },
        tickets: {
          total: totalTickets,
          open: openTickets,
          resolved: resolvedTickets,
          closed: closedTickets,
          urgent: urgentTickets
        },
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          availableTechnicians
        },
        payments: {
          totalRevenue,
          monthlyRevenue,
          pending: pendingPayments,
          overdue: overduePayments
        },
        packages: {
          total: totalPackages,
          mostPopular: mostPopularPackage
        },
        feedback: {
          total: totalFeedback,
          averageRating
        }
      },
      recentActivities,
      analytics
    });
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    return json({
      user,
      stats: null,
      recentActivities: null,
      analytics: null,
      error: "Failed to load dashboard data"
    });
  }
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const { user, stats, recentActivities, analytics } = data;

  if ('error' in data && data.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <PageContainer className="py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h2>
            <p className="text-gray-600">{'error' in data ? data.error : 'Unknown error occurred'}</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <PageContainer className="py-8">
          <div className="text-center">
            <Activity className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard...</h2>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <PageContainer className="py-8">
        <PageHeader
          title={`Selamat Datang, ${user.employee?.name || 'User'}`}
          description="Kelola operasional ISP Anda dengan mudah dan efisien"
        />

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Pelanggan"
            value={stats.customers.total.toLocaleString()}
            icon={Users}
            iconClassName={iconVariants.green}
            trend={{
              value: `${stats.customers.active} aktif`,
              isPositive: true
            }}
            description={`+${stats.customers.newThisMonth} bulan ini`}
          />

          <StatsCard
            title="Tiket Aktif"
            value={stats.tickets.open.toLocaleString()}
            icon={Ticket}
            iconClassName={stats.tickets.urgent > 0 ? iconVariants.orange : iconVariants.orange}
            description={`${stats.tickets.urgent} prioritas tinggi`}
            trend={{
              value: `${stats.tickets.resolved} diselesaikan`,
              isPositive: true
            }}
          />

          <StatsCard
            title="Teknisi"
            value={stats.employees.active.toString()}
            icon={UserCheck}
            iconClassName={iconVariants.blue}
            description={`${stats.employees.availableTechnicians} tersedia`}
            trend={{
              value: `${stats.employees.total} total`,
              isPositive: true
            }}
          />

          <StatsCard
            title="Pendapatan"
            value={`Rp ${(stats.payments.totalRevenue / 1000000).toFixed(1)}M`}
            icon={DollarSign}
            iconClassName={iconVariants.purple}
            trend={{
              value: `Rp ${(stats.payments.monthlyRevenue / 1000000).toFixed(1)}M bulan ini`,
              isPositive: true
            }}
            description={`${stats.payments.pending} pending`}
          />
        </div>

        {/* Analytics and Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Customer Growth Chart */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                Customer Growth Trend
              </CardTitle>
              <CardDescription>
                Customer registration trends over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.monthlyGrowth.map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">{month.month}</span>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <div
                          className="h-2 bg-blue-500 rounded mr-2"
                          style={{ width: `${Math.max(month.customers * 10, 10)}px` }}
                        ></div>
                        <span className="text-sm font-semibold">{month.customers}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Analytics */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                Revenue Analytics
              </CardTitle>
              <CardDescription>
                Monthly revenue trends and payment status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Total Revenue</p>
                    <p className="text-lg font-bold text-green-700">
                      Rp {(stats.payments.totalRevenue / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">This Month</p>
                    <p className="text-lg font-bold text-blue-700">
                      Rp {(stats.payments.monthlyRevenue / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {analytics?.monthlyGrowth.slice(-3).map((month, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{month.month}</span>
                      <div className="flex items-center">
                        <div
                          className="h-2 bg-green-500 rounded mr-2"
                          style={{ width: `${Math.max(month.revenue / 1000000 * 20, 10)}px` }}
                        ></div>
                        <span className="text-sm font-semibold">
                          Rp {(month.revenue / 1000000).toFixed(1)}M
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Metrics and Employee Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Ticket Resolution Metrics */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5 text-orange-600" />
                Ticket Resolution Metrics
              </CardTitle>
              <CardDescription>
                Current ticket status and resolution performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">Open Tickets</p>
                        <p className="text-2xl font-bold text-orange-700">{stats.tickets.open}</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-500" />
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Resolved</p>
                        <p className="text-2xl font-bold text-green-700">{stats.tickets.resolved}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                </div>

                {stats.tickets.urgent > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-sm font-medium text-red-700">
                        {stats.tickets.urgent} urgent tickets require immediate attention
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Resolution Rate</span>
                    <span>{((stats.tickets.resolved / stats.tickets.total) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(stats.tickets.resolved / stats.tickets.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Performance */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="mr-2 h-5 w-5 text-purple-600" />
                Employee Performance
              </CardTitle>
              <CardDescription>
                Top performing employees and workload distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Active Employees</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.employees.active}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Available</p>
                    <p className="text-2xl font-bold text-green-700">{stats.employees.availableTechnicians}</p>
                  </div>
                </div>

                {analytics?.topEmployees && analytics.topEmployees.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Top Performers</h4>
                    {analytics.topEmployees.slice(0, 3).map((employee, index) => (
                      <div key={employee.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-2 ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                            }`}>
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{employee.name}</span>
                        </div>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-sm font-semibold">
                            {Number(employee.performanceMetrics?.customerRating).toFixed(1) || 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {stats.feedback.total > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Rating</span>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm font-semibold">{stats.feedback.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {stats.customers.active} Active
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                Customer Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/customers">
                <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                  <Users className="mr-2 h-4 w-4" />
                  View Customers
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Ticket className="h-6 w-6 text-white" />
                </div>
                <Badge variant="secondary" className={`${stats.tickets.urgent > 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                  {stats.tickets.open} Open
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                Support Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/tickets">
                <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                  <Ticket className="mr-2 h-4 w-4" />
                  View Tickets
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {stats.payments.pending} Pending
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                Payments & Billing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/payments">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white">
                  <DollarSign className="mr-2 h-4 w-4" />
                  View Payments
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  Analytics
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                Reports & Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/billing">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Reports
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Tickets */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ticket className="mr-2 h-5 w-5 text-orange-600" />
                Recent Tickets
              </CardTitle>
              <CardDescription>
                Latest support tickets that need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities?.tickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ticket.title}</p>
                      <p className="text-xs text-gray-500">
                        {ticket.customerId} • {format(new Date(ticket.createdAt), "dd MMM", { locale: id })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={ticket.priority === 'URGENT' ? 'destructive' : 'secondary'} className="text-xs">
                        {ticket.priority}
                      </Badge>
                      <Badge variant={ticket.status === 'RESOLVED' ? 'default' : 'outline'} className="text-xs">
                        {ticket.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!recentActivities?.tickets || recentActivities.tickets.length === 0) && (
                  <p className="text-center text-gray-500 py-4">No recent tickets</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Customers */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-green-600" />
                New Customers
              </CardTitle>
              <CardDescription>
                Recently registered customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities?.customers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-gray-500">
                        {customer.package?.name || 'No package'} • {format(new Date(customer.createdAt), "dd MMM", { locale: id })}
                      </p>
                    </div>
                    <Badge variant={customer.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                      {customer.status}
                    </Badge>
                  </div>
                ))}
                {(!recentActivities?.customers || recentActivities.customers.length === 0) && (
                  <p className="text-center text-gray-500 py-4">No recent customers</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 p-8 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-3xl border border-green-200/50 backdrop-blur-sm">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg mr-3">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Status Pengembangan
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center p-4 bg-white/60 rounded-xl border border-white/30">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-gray-700 font-medium">Foundation & UI</span>
            </div>
            <div className="flex items-center p-4 bg-white/60 rounded-xl border border-white/30">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-gray-700 font-medium">Database Setup</span>
            </div>
            <div className="flex items-center p-4 bg-white/60 rounded-xl border border-white/30">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-gray-700 font-medium">Authentication</span>
            </div>
            <div className="flex items-center p-4 bg-white/60 rounded-xl border border-white/30">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-gray-700 font-medium">Core UI Components</span>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}