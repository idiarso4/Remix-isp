import { useLoaderData, useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DataTable, type Column } from "~/components/tables/data-table";
import { DeleteConfirmDialog } from "~/components/ui/confirm-dialog";
import { PermissionGate } from "~/components/permission-gate";
import { Edit, Trash2, CreditCard, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Payment {
  id: string;
  amount: number | string;
  paymentDate: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  customer: {
    id: string;
    name: string;
    email: string;
    package?: {
      name: string;
      price: number;
    };
  };
}

interface PaymentListProps {
  customerId: string;
}

export function PaymentList({ customerId }: PaymentListProps) {
  const fetcher = useFetcher<{ payments: Payment[]; user: any }>();
  const deleteFetcher = useFetcher();

  useEffect(() => {
    fetcher.load(`/api/payments?customer=${customerId}`);
  }, [customerId, fetcher]);

  const payments = fetcher.data?.payments || [];
  const user = fetcher.data?.user;

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
      default: return <CreditCard className="h-4 w-4" />;
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
  const columns: Column<Payment>[] = [
    {
      key: 'amount',
      header: 'Jumlah',
      sortable: true,
      render: (payment) => (
        <div className="font-medium">
          {formatCurrency(Number(payment.amount))}
        </div>
      )
    },
    {
      key: 'paymentDate',
      header: 'Tanggal Pembayaran',
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
      header: 'Aksi',
      render: (payment) => (
        <div className="flex items-center space-x-2">
          {user && (
            <>
              <PermissionGate user={user} resource="customers" action="update">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    // Navigate to edit payment page
                    window.location.href = `/payments/${payment.id}/edit`;
                  }}
                  title="Edit Pembayaran"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </PermissionGate>

              <PermissionGate user={user} resource="customers" action="delete">
                <DeleteConfirmDialog
                  itemName={`pembayaran sebesar ${formatCurrency(Number(payment.amount))}`}
                  onConfirm={() => {
                    deleteFetcher.submit(
                      { _method: "DELETE", id: payment.id },
                      { method: "post", action: "/api/payments" }
                    );
                  }}
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:border-red-300" 
                    title="Hapus Pembayaran"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DeleteConfirmDialog>
              </PermissionGate>
            </>
          )}
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

  if (fetcher.state === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Riwayat Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Riwayat Pembayaran
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length > 0 ? (
          <>
            {/* Payment Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Total Pembayaran</p>
                    <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Lunas</p>
                    <p className="text-xl font-bold text-green-600">{stats.paid}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Pending</p>
                    <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Terlambat</p>
                    <p className="text-xl font-bold text-red-600">{stats.overdue}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Tagihan</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Sudah Dibayar</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

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
          </>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada pembayaran</h3>
            <p className="mt-1 text-sm text-gray-500">
              Belum ada riwayat pembayaran untuk pelanggan ini.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}