import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useFetcher } from "@remix-run/react";
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
import { Plus, Edit, Trash2, Eye, CreditCard, DollarSign, Calendar, Printer } from "lucide-react";
import { QuickExportButton } from "~/components/ui/export-button";
import { db } from "~/lib/db.server";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "payments", "read");
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");
  const month = url.searchParams.get("month");

  const where: any = {};
  if (search) {
    where.OR = [
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { customer: { email: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }
  if (month) {
    const startDate = new Date(month + "-01");
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    where.paymentDate = {
      gte: startDate,
      lte: endDate
    };
  }

  const payments = await db.payment.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          package: {
            select: { name: true, price: true }
          }
        }
      }
    },
    orderBy: { paymentDate: "desc" },
  });
  
  return json({ user, payments });
}

export default function PaymentsIndex() {
  const { user, payments } = useLoaderData<typeof loader>();
  const deleteFetcher = useFetcher();

  // Filter options
  const filterOptions: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'Semua Status' },
        { value: 'PAID', label: 'Lunas' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'OVERDUE', label: 'Terlambat' }
      ]
    },
    {
      key: 'month',
      label: 'Bulan',
      type: 'select',
      options: [
        { value: '', label: 'Semua Bulan' },
        { value: '2024-01', label: 'Januari 2024' },
        { value: '2024-02', label: 'Februari 2024' },
        { value: '2024-03', label: 'Maret 2024' },
        { value: '2024-04', label: 'April 2024' },
        { value: '2024-05', label: 'Mei 2024' },
        { value: '2024-06', label: 'Juni 2024' },
        { value: '2024-07', label: 'Juli 2024' },
        { value: '2024-08', label: 'Agustus 2024' },
        { value: '2024-09', label: 'September 2024' },
        { value: '2024-10', label: 'Oktober 2024' },
        { value: '2024-11', label: 'November 2024' },
        { value: '2024-12', label: 'Desember 2024' }
      ]
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

  // Table columns
  const columns: Column<typeof payments[0]>[] = [
    {
      key: 'customer',
      header: 'Pelanggan',
      sortable: true,
      render: (payment) => (
        <div>
          <div className="font-medium text-gray-900">{payment.customer.name}</div>
          <div className="text-sm text-gray-500">{payment.customer.email || 'Tidak ada email'}</div>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Jumlah',
      sortable: true,
      render: (payment) => (
        <div className="flex items-center">
          <DollarSign className="mr-1 h-4 w-4 text-green-500" />
          <span className="font-semibold text-green-600">
            Rp {Number(payment.amount).toLocaleString('id-ID')}
          </span>
        </div>
      )
    },
    {
      key: 'paymentDate',
      header: 'Tanggal Pembayaran',
      sortable: true,
      render: (payment) => (
        <div className="flex items-center">
          <Calendar className="mr-2 h-4 w-4 text-gray-400" />
          {format(new Date(payment.paymentDate), "dd MMM yyyy", { locale: id })}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (payment) => (
        <Badge variant={getStatusVariant(payment.status)}>
          {payment.status === 'PAID' ? 'Lunas' : 
           payment.status === 'PENDING' ? 'Pending' : 'Terlambat'}
        </Badge>
      )
    },
    {
      key: 'package',
      header: 'Paket',
      render: (payment) => (
        <span className="text-sm">
          {payment.customer.package?.name || 'Tidak ada paket'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (payment) => (
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/payments/${payment.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          
          <PermissionGate user={user} resource="payments" action="update">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/payments/${payment.id}/edit`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </PermissionGate>
          
          <PermissionGate user={user} resource="payments" action="delete">
            <DeleteConfirmDialog
              itemName={`Pembayaran ${payment.customer.name}`}
              onConfirm={() => {
                deleteFetcher.submit(
                  { _method: "DELETE", id: payment.id },
                  { method: "post", action: "/api/payments" }
                );
              }}
            >
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DeleteConfirmDialog>
          </PermissionGate>
        </div>
      )
    }
  ];

  // Stats
  const stats = {
    total: payments.length,
    paid: payments.filter(p => p.status === 'PAID').length,
    pending: payments.filter(p => p.status === 'PENDING').length,
    overdue: payments.filter(p => p.status === 'OVERDUE').length,
    totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    paidAmount: payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0)
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Manajemen Pembayaran"
        description="Kelola pembayaran dan billing pelanggan"
      >
        <div className="flex items-center space-x-3">
          <QuickExportButton 
            type="payments" 
            data={payments} 
            className="print:hidden"
          />
          
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>
          
          <PermissionGate user={user} resource="payments" action="create">
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 print:hidden" asChild>
              <Link to="/payments/new">
                <Plus className="mr-2 h-4 w-4" />
                Catat Pembayaran
              </Link>
            </Button>
          </PermissionGate>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:mb-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Pembayaran</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Lunas</p>
              <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-yellow-600" />
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
              <CreditCard className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Terlambat</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-lg text-white">
          <h3 className="text-lg font-semibold mb-2">Total Pendapatan</h3>
          <p className="text-3xl font-bold">Rp {stats.totalAmount.toLocaleString('id-ID')}</p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-lg text-white">
          <h3 className="text-lg font-semibold mb-2">Pendapatan Terkonfirmasi</h3>
          <p className="text-3xl font-bold">Rp {stats.paidAmount.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 print:p-4">
          <SearchFilter
            searchPlaceholder="Cari pembayaran..."
            filters={filterOptions}
            className="mb-6 print:hidden"
          />
          
          <DataTable
            data={payments}
            columns={columns}
            searchable={false}
            sortable={true}
            emptyMessage="Tidak ada data pembayaran"
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
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          .print\\:p-4 {
            padding: 1rem !important;
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