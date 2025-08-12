import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { PaymentList } from "~/components/payments/payment-list";
import { PaymentForm } from "~/components/payments/payment-form";
import { DataGrid, DataCard } from "~/components/ui/data-grid";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Clock,
  Plus,
  RefreshCw,
  Filter,
  Calendar
} from "lucide-react";
import { useFetcher } from "@remix-run/react";
import { db } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "read");

  // Get customers for the form
  const customers = await db.customer.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      package: {
        select: {
          name: true,
          price: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return json({ user, customers });
}

export default function PaymentsManagement() {
  const { user, customers } = useLoaderData<typeof loader>();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [period, setPeriod] = useState("month");
  
  const statsFetcher = useFetcher();

  // Load payment stats
  useEffect(() => {
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    
    statsFetcher.load(`/api/payments/stats?${params.toString()}`);
  }, [period]);

  // Update stats when data is loaded
  useEffect(() => {
    if (statsFetcher.data && typeof statsFetcher.data === 'object' && !('error' in statsFetcher.data)) {
      setStats(statsFetcher.data);
    }
  }, [statsFetcher.data]);

  const handleAddPayment = () => {
    setEditingPayment(null);
    setShowAddForm(true);
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setShowAddForm(true);
  };

  const handleFormComplete = () => {
    setShowAddForm(false);
    setEditingPayment(null);
    // Refresh stats
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    statsFetcher.load(`/api/payments/stats?${params.toString()}`);
  };

  const refreshData = () => {
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    statsFetcher.load(`/api/payments/stats?${params.toString()}`);
  };

  const isLoading = statsFetcher.state === "loading";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Payment Management"
        description="Manage customer payments and billing records"
      >
        <div className="flex items-center space-x-3">
          {/* Period Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="year">This Year</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
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

          <Button
            onClick={handleAddPayment}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Payment
          </Button>
        </div>
      </PageHeader>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-8">
          <PaymentForm
            payment={editingPayment}
            customers={customers}
            onSubmitComplete={handleFormComplete}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Statistics */}
      {isLoading && !stats ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mr-3 text-blue-500" />
          <span className="text-lg text-gray-600">Loading payment data...</span>
        </div>
      ) : stats ? (
        <div className="space-y-8">
          {/* Summary Cards */}
          <DataGrid columns={4}>
            <DataCard>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    Rp {stats.summary.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </DataCard>

            <DataCard>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold">{stats.summary.totalPayments}</p>
                </div>
              </div>
            </DataCard>

            <DataCard>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">{stats.summary.statusBreakdown.PENDING}</p>
                </div>
              </div>
            </DataCard>

            <DataCard>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold">{stats.summary.statusBreakdown.OVERDUE}</p>
                </div>
              </div>
            </DataCard>
          </DataGrid>

          {/* Revenue Breakdown */}
          <DataGrid columns={2} className="gap-8">
            <DataCard title="Revenue by Status">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Paid</span>
                  </div>
                  <span className="font-bold">
                    Rp {stats.summary.revenueByStatus.PAID.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium">Pending</span>
                  </div>
                  <span className="font-bold">
                    Rp {stats.summary.revenueByStatus.PENDING.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">Overdue</span>
                  </div>
                  <span className="font-bold">
                    Rp {stats.summary.revenueByStatus.OVERDUE.toLocaleString()}
                  </span>
                </div>
              </div>
            </DataCard>

            <DataCard title="Monthly Trends">
              <div className="space-y-3">
                {stats.monthlyTrends.slice(-6).map((trend: any) => (
                  <div key={trend.month} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {new Date(trend.month + '-01').toLocaleDateString('id-ID', { 
                          year: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        Rp {trend.totalRevenue.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {trend.totalPayments} payments
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DataCard>
          </DataGrid>

          {/* Top Customers */}
          {stats.topCustomers.length > 0 && (
            <DataCard title="Top Customers by Payment Amount">
              <div className="space-y-3">
                {stats.topCustomers.slice(0, 5).map((customer: any, index: number) => (
                  <div key={customer.customer.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{customer.customer.name}</p>
                        <p className="text-xs text-gray-500">
                          {customer.paymentCount} payments
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        Rp {customer.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </DataCard>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Payment Data
          </h3>
          <p className="text-gray-600">
            Start by adding payment records for your customers.
          </p>
        </div>
      )}

      {/* Payment List */}
      <div className="mt-8">
        <PaymentList
          onEditPayment={handleEditPayment}
        />
      </div>
    </PageContainer>
  );
}