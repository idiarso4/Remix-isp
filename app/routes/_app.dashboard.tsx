import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { db } from "~/lib/db.server";
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
    // Get all data in parallel for better performance
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
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const monthlyRevenue = payments
      .filter(p => new Date(p.paymentDate) >= startOfMonth)
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
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

    // Recent activities
    const recentTickets = tickets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const recentCustomers = customers
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

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
      }).reduce((sum, p) => sum + p.amount.toNumber(), 0);

      monthlyGrowth.push({
        month: format(date, 'MMM yyyy', { locale: id }),
        customers: monthCustomers,
        tickets: monthTickets,
        revenue: monthRevenue
      });
    }

    // Top performing employees
    const topEmployees = employees
      .filter(e => e.performanceMetrics)
      .sort((a, b) => {
        const aRating = a.performanceMetrics?.customerRating.toNumber() || 0;
        const bRating = b.performanceMetrics?.customerRating.toNumber() || 0;
        return bRating - aRating;
      })
      .slice(0, 5);

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
      recentActivities: {
        tickets: recentTickets,
        customers: recentCustomers
      },
      analytics: {
        monthlyGrowth,
        topEmployees
      }
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">Aktif</Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                Manajemen Pelanggan
              </CardTitle>
              <CardDescription className="text-gray-600">
                Kelola pelanggan WiFi, lacak status, dan tangani penagihan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/customers">
                <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                  <Users className="mr-2 h-4 w-4" />
                  Lihat Pelanggan
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">4 Paket</Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                Paket Internet
              </CardTitle>
              <CardDescription className="text-gray-600">
                Buat dan kelola paket layanan internet dengan penetapan harga yang fleksibel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/packages">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white">
                  <Package className="mr-2 h-4 w-4" />
                  Kelola Paket
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
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">89 Aktif</Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                Tiket Support
              </CardTitle>
              <CardDescription className="text-gray-600">
                Tangani masalah pelanggan dan lacak resolusi dengan sistem ticketing terintegrasi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/tickets">
                <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                  <Ticket className="mr-2 h-4 w-4" />
                  Lihat Tiket
                </Button>
              </Link>
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