import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { DataGrid, DataCard } from "~/components/ui/data-grid";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Package
} from "lucide-react";

interface FinancialData {
  summary: {
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    overdueRevenue: number;
    totalPayments: number;
    averageRevenuePerCustomer: number;
    collectionRate: number;
    period: string;
  };
  revenueByStatus: Record<string, number>;
  paymentsByStatus: Record<string, number>;
  revenueByPackage: Array<{
    packageName: string;
    revenue: number;
    paymentCount: number;
    packageInfo: {
      name: string;
      price: number;
      speed: string;
    };
  }>;
  monthlyRevenue: Array<{
    month: string;
    totalRevenue: number;
    paidRevenue: number;
    paymentCount: number;
    paidCount: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    packageName: string;
    totalAmount: number;
    paymentCount: number;
    paymentStatus: string;
  }>;
  overdueCustomers: Array<{
    customerId: string;
    customerName: string;
    totalOverdue: number;
    paymentStatus: string;
  }>;
}

interface FinancialReportProps {
  period?: string;
  className?: string;
}

export function FinancialReport({ 
  period = "month", 
  className 
}: FinancialReportProps) {
  const [data, setData] = useState<FinancialData | null>(null);
  const financialFetcher = useFetcher();

  // Load financial data
  useEffect(() => {
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    
    financialFetcher.load(`/api/reports/financial?${params.toString()}`);
  }, [period]);

  // Update data when loaded
  useEffect(() => {
    if (financialFetcher.data && typeof financialFetcher.data === 'object' && !('error' in financialFetcher.data)) {
      setData(financialFetcher.data as FinancialData);
    }
  }, [financialFetcher.data]);

  const refreshData = () => {
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    financialFetcher.load(`/api/reports/financial?${params.toString()}`);
  };

  const isLoading = financialFetcher.state === "loading";

  if (isLoading && !data) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mr-3 text-blue-500" />
          <span className="text-lg text-gray-600">Loading financial report...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={className}>
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Financial Data Available
          </h3>
          <p className="text-gray-600">
            Financial reports will appear here once payments are recorded.
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
          <DollarSign className="h-6 w-6 text-green-500" />
          <h2 className="text-2xl font-bold text-gray-900">Financial Report</h2>
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
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold">
                Rp {data.summary.totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid Revenue</p>
              <p className="text-2xl font-bold">
                Rp {data.summary.paidRevenue.toLocaleString()}
              </p>
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
              <p className="text-2xl font-bold">
                Rp {data.summary.pendingRevenue.toLocaleString()}
              </p>
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
              <p className="text-2xl font-bold">
                Rp {data.summary.overdueRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </DataCard>
      </DataGrid>

      {/* Key Metrics */}
      <DataGrid columns={3} className="mb-8">
        <DataCard>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {data.summary.collectionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Collection Rate</div>
            <Progress value={data.summary.collectionRate} className="mt-2" />
          </div>
        </DataCard>

        <DataCard>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              Rp {Math.round(data.summary.averageRevenuePerCustomer).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Avg Revenue/Customer</div>
          </div>
        </DataCard>

        <DataCard>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {data.summary.totalPayments}
            </div>
            <div className="text-sm text-gray-500">Total Payments</div>
          </div>
        </DataCard>
      </DataGrid>

      {/* Revenue Analysis */}
      <DataGrid columns={2} className="gap-8 mb-8">
        {/* Revenue by Status */}
        <DataCard title="Revenue by Payment Status">
          <div className="space-y-4">
            {Object.entries(data.revenueByStatus).map(([status, revenue]) => {
              const percentage = data.summary.totalRevenue > 0 
                ? (revenue / data.summary.totalRevenue) * 100 
                : 0;
              const count = data.paymentsByStatus[status] || 0;
              
              const statusColors = {
                PAID: 'bg-green-500',
                PENDING: 'bg-yellow-500',
                OVERDUE: 'bg-red-500'
              };
              
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${statusColors[status as keyof typeof statusColors]}`}></div>
                    <span className="font-medium">{status}</span>
                    <Badge variant="outline" className="text-xs">
                      {count} payments
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      Rp {revenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>

        {/* Revenue by Package */}
        <DataCard title="Revenue by Package">
          <div className="space-y-3">
            {data.revenueByPackage.slice(0, 5).map((pkg) => {
              const percentage = data.summary.totalRevenue > 0 
                ? (pkg.revenue / data.summary.totalRevenue) * 100 
                : 0;
              
              return (
                <div key={pkg.packageName} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium text-sm">{pkg.packageName}</p>
                      <p className="text-xs text-gray-500">
                        {pkg.paymentCount} payments
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">
                      Rp {pkg.revenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      </DataGrid>

      {/* Monthly Trends */}
      <DataCard title="Monthly Revenue Trends" className="mb-8">
        <div className="space-y-3">
          {data.monthlyRevenue.slice(-6).map((month) => {
            const collectionRate = month.totalRevenue > 0 
              ? (month.paidRevenue / month.totalRevenue) * 100 
              : 0;
            
            return (
              <div key={month.month} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {new Date(month.month + '-01').toLocaleDateString('id-ID', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="text-sm font-bold">
                      Rp {month.totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {month.paymentCount} payments
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600">
                      Rp {month.paidRevenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {collectionRate.toFixed(1)}% collected
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DataCard>

      {/* Top Customers and Overdue */}
      <DataGrid columns={2} className="gap-8">
        {/* Top Customers */}
        <DataCard title="Top Paying Customers">
          <div className="space-y-3">
            {data.topCustomers.slice(0, 5).map((customer, index) => (
              <div key={customer.customerId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{customer.customerName}</p>
                    <p className="text-xs text-gray-500">
                      {customer.packageName} • {customer.paymentCount} payments
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">
                    Rp {customer.totalAmount.toLocaleString()}
                  </div>
                  <Badge 
                    className={`text-xs ${
                      customer.paymentStatus === 'PAID' 
                        ? 'bg-green-100 text-green-700'
                        : customer.paymentStatus === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {customer.paymentStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DataCard>

        {/* Overdue Customers */}
        <DataCard title="Overdue Customers">
          {data.overdueCustomers.length > 0 ? (
            <div className="space-y-3">
              {data.overdueCustomers.slice(0, 5).map((customer) => (
                <div key={customer.customerId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-sm">{customer.customerName}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-red-600">
                      Rp {customer.totalOverdue.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">overdue</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm">No overdue payments</p>
            </div>
          )}
        </DataCard>
      </DataGrid>
    </div>
  );
}