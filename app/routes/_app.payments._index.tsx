import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useFetcher, useSearchParams, useNavigate } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { PermissionGate } from "~/components/permission-gate";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { DataTable, type Column } from "~/components/tables/data-table";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { SearchFilter, type FilterOption } from "~/components/ui/search-filter";
import { DeleteConfirmDialog } from "~/components/ui/confirm-dialog";
import { QuickExportButton } from "~/components/ui/export-button";
import { Plus, Edit, Trash2, Eye, DollarSign, Clock, CheckCircle, AlertTriangle, Printer } from "lucide-react";
import { db } from "~/lib/db.server";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "read");

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");
  const customerId = url.searchParams.get("customer");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const where: any = {};
  
  if (search) {
    where.customer = {
      name: { contains: search, mode: "insensitive" }
    };
  }
  
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }
  
  if (customerId) {
    where.customerId = customerId;
  }
  
  if (dateFrom) {
    where.paymentDate = { gte: new Date(dateFrom) };
  }
  
  if (dateTo) {
    where.paymentDate = { 
      ...where.paymentDate,
      lte: new Date(dateTo) 
    };
  }

  const [payments, customers] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        customer: {
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
          }
        }
      },
      orderBy: { paymentDate: 'desc' }
    }),
    db.customer.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ]);

  return json({ user, payments, customers });
}

export default function PaymentsIndex() {
  const { user, payments, customers } = useLoaderData<typeof loader>();
  const deleteFetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filter options
  const filterOptions: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'PAID', label: 'Paid' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'OVERDUE', label: 'Overdue' }
      ]
    },
    {
      key: 'customer',
      label: 'Customer',
      type: 'select',
      options: [
        { value: 'all', label: 'All Customers' },
        ...customers.map(customer => ({ value: customer.id, label: customer.name }))
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
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (payment) => (
        <div className="flex items-center space-x-2">
          <Link to={`/payments/${payment.id}`} title="View Details">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>

          <PermissionGate user={user} resource="customers" action="update">
            <Link to={`/payments/${payment.id}/edit`} title="Edit Payment">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </PermissionGate>

          <PermissionGate user={user} resource="customers" action="delete">
            <DeleteConfirmDialog
              itemName={`payment from ${payment.customer.name}`}
              onConfirm={() => {
                deleteFetcher.submit(
                  { _method: "DELETE", id: payment.id },
                  { method: "post", action: "/api/payments" }
                );
              }}
            >
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:border-red-300" title="Delete Payment">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DeleteConfirmDialog>
          </PermissionGate>
        </div>
      )
    }
  ];

  // Calculate statistics
  const stats = {
    total: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    paid: payments.filter(p => p.status === 'PAID').length,
    pending: payments.filter(p => p.status === 'PENDING').length,
    overdue: payments.filter(p => p.status === 'OVERDUE').length,
    paidAmount: payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0)
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Payment Management"
        description="Track customer payments and billing status"
      >
        <div className="flex items-center space-x-3">
          <QuickExportButton
            type="payments"
            data={payments}
            className="print:hidden"
          />

          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>

          <PermissionGate user={user} resource="customers" action="create">
            <Link to="/payments/new">
              <Button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 print:hidden">
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </Link>
          </PermissionGate>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:mb-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Paid</p>
              <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Collected Revenue</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <SearchFilter
            searchPlaceholder="Search payments..."
            filters={filterOptions}
            className="mb-6 print:hidden"
            searchValue={searchParams.get('search') || ''}
            filterValues={{
              status: searchParams.get('status') || '',
              customer: searchParams.get('customer') || '',
              dateFrom: searchParams.get('dateFrom') || '',
              dateTo: searchParams.get('dateTo') || ''
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
              navigate('/payments');
            }}
          />

          <DataTable
            data={payments}
            columns={columns}
            searchable={false}
            sortable={true}
            emptyMessage="No payment data found"
            pagination={{
              currentPage: 1,
              totalPages: 1,
              pageSize: 10,
              totalItems: payments.length,
              onPageChange: (page) => console.log('Page changed:', page)
            }}
          />
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
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