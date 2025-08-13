import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useNavigate } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { DataTable, type Column } from "~/components/tables/data-table";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { SearchFilter, type FilterOption } from "~/components/ui/search-filter";
import { QuickExportButton } from "~/components/ui/export-button";
import { 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Calendar,
  Printer,
  FileText
} from "lucide-react";
import { db } from "~/lib/db.server";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id } from "date-fns/locale";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "read");

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  // Get current month for default filtering
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const where: any = {};
  
  if (search) {
    where.customer = {
      name: { contains: search, mode: "insensitive" }
    };
  }
  
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }
  
  if (dateFrom) {
    where.paymentDate = { gte: new Date(dateFrom) };
  } else {
    where.paymentDate = { gte: monthStart };
  }
  
  if (dateTo) {
    where.paymentDate = { 
      ...where.paymentDate,
      lte: new Date(dateTo) 
    };
  } else {
    where.paymentDate = { 
      ...where.paymentDate,
      lte: monthEnd 
    };
  }

  // Get billing data
  const [payments, customers, packages] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            package: {
              select: {
                name: true,
                price: true,
                duration: true
              }
            }
          }
        }
      },
      orderBy: { paymentDate: 'desc' }
    }),
    db.customer.findMany({
      where: { status: 'ACTIVE' },
      select: { 
        id: true, 
        name: true,
        package: {
          select: {
            price: true,
            duration: true
          }
        }
      }
    }),
    db.package.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true }
    })
  ]);

  // Calculate billing statistics
  const stats = {
    totalCustomers: customers.length,
    totalPayments: payments.length,
    totalRevenue: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    paidPayments: payments.filter(p => p.status === 'PAID').length,
    pendingPayments: payments.filter(p => p.status === 'PENDING').length,
    overduePayments: payments.filter(p => p.status === 'OVERDUE').length,
    paidRevenue: payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0),
    pendingRevenue: payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + Number(p.amount), 0),
    overdueRevenue: payments.filter(p => p.status === 'OVERDUE').reduce((sum, p) => sum + Number(p.amount), 0),
    expectedMonthlyRevenue: customers.reduce((sum, c) => {
      if (c.package) {
        const monthlyAmount = c.package.duration === 'MONTHLY' ? c.package.price : c.package.price / 12;
        return sum + monthlyAmount;
      }
      return sum;
    }, 0)
  };

  // Calculate collection rate
  const collectionRate = stats.totalRevenue > 0 ? (stats.paidRevenue / stats.totalRevenue) * 100 : 0;

  return json({ 
    user, 
    payments, 
    customers, 
    packages, 
    stats: { ...stats, collectionRate },
    currentPeriod: {
      start: format(monthStart, 'yyyy-MM-dd'),
      end: format(monthEnd, 'yyyy-MM-dd'),
      label: format(currentMonth, 'MMMM yyyy', { locale: id })
    }
  });
}

export default function BillingReport() {
  const { user, payments, stats, currentPeriod } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filter options
  const filterOptions: FilterOption[] = [
    {
      key: 'status',
      label: 'Payment Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'PAID', label: 'Paid' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'OVERDUE', label: 'Overdue' }
      ]
    },
    {
      key: 'dateFrom',
      label: 'From Date',
      type: 'date'
    },
    {
      key: 'dateTo',
      label: 'To Date',
      type: 'date'
    }
  ];

  // Status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PAID': return 'default';
      case 'PENDING': return 'secondary';
      case 'OVERDUE': return 'destructive';
      default: return 'outline';
    }
  };

  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return <CheckCircle className="h-4 w-4" />;
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'OVERDUE': return <AlertTriangle className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  // Table columns
  const columns: Column<typeof payments[0]>[] = [
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
      render: (payment) => (
        <div>
          <div className="font-medium text-gray-900">{payment.customer.name}</div>
          <div className="text-sm text-gray-500">
            {payment.customer.package?.name || 'No package'}
          </div>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (payment) => (
        <div className="font-medium">
          {formatCurrency(Number(payment.amount))}
        </div>
      )
    },
    {
      key: 'paymentDate',
      header: 'Payment Date',
      sortable: true,
      render: (payment) => (
        <span className="text-sm">
          {format(new Date(payment.paymentDate), "dd MMM yyyy", { locale: id })}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (payment) => (
        <Badge variant={getStatusVariant(payment.status)} className="flex items-center w-fit">
          {getStatusIcon(payment.status)}
          <span className="ml-1">{payment.status}</span>
        </Badge>
      )
    }
  ];

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Billing & Revenue Report"
        description={`Billing status and revenue tracking for ${currentPeriod.label}`}
      >
        <div className="flex items-center space-x-3">
          <QuickExportButton
            type="billing"
            data={payments}
            className="print:hidden"
          />

          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>
      </PageHeader>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Active Customers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Collection Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.collectionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Expected Revenue</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.expectedMonthlyRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Payments</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totalPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Paid Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidRevenue)}</p>
                <p className="text-sm text-gray-500">{stats.paidPayments} payments</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Revenue</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingRevenue)}</p>
                <p className="text-sm text-gray-500">{stats.pendingPayments} payments</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Overdue Revenue</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdueRevenue)}</p>
                <p className="text-sm text-gray-500">{stats.overduePayments} payments</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SearchFilter
            searchPlaceholder="Search customers..."
            filters={filterOptions}
            className="mb-6 print:hidden"
            searchValue={searchParams.get('search') || ''}
            filterValues={{
              status: searchParams.get('status') || '',
              dateFrom: searchParams.get('dateFrom') || currentPeriod.start,
              dateTo: searchParams.get('dateTo') || currentPeriod.end
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
              navigate('/billing');
            }}
          />

          <DataTable
            data={payments}
            columns={columns}
            searchable={false}
            sortable={true}
            emptyMessage="No payment data found for the selected period"
            pagination={{
              currentPage: 1,
              totalPages: 1,
              pageSize: 20,
              totalItems: payments.length,
              onPageChange: (page) => console.log('Page changed:', page)
            }}
          />
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