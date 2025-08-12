import { useState, useEffect } from "react";
import { useFetcher, Link } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DataTable, type Column } from "~/components/tables/data-table";
import { ViewEditDeleteMenu } from "~/components/ui/action-menu";
import { DeleteConfirmDialog } from "~/components/ui/confirm-dialog";
import { 
  DollarSign, 
  Calendar, 
  User,
  RefreshCw,
  Filter,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  status: string;
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    package?: {
      name: string;
      price: number;
    };
  };
}

interface PaymentListProps {
  customerId?: string;
  onEditPayment?: (payment: Payment) => void;
  className?: string;
}

export function PaymentList({
  customerId,
  onEditPayment,
  className
}: PaymentListProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  });
  const [filters, setFilters] = useState({
    status: "all",
    search: ""
  });
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const paymentsFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  // Load payments
  const loadPayments = (page = 1) => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", pagination.limit.toString());
    
    if (customerId) params.set("customerId", customerId);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);

    paymentsFetcher.load(`/api/payments?${params.toString()}`);
  };

  // Initial load
  useEffect(() => {
    loadPayments();
  }, [customerId, filters]);

  // Update payments when data is loaded
  useEffect(() => {
    if (paymentsFetcher.data && typeof paymentsFetcher.data === 'object' && 'payments' in paymentsFetcher.data) {
      setPayments(paymentsFetcher.data.payments as Payment[]);
      if ('pagination' in paymentsFetcher.data) {
        setPagination(paymentsFetcher.data.pagination as any);
      }
    }
  }, [paymentsFetcher.data]);

  // Handle delete completion
  useEffect(() => {
    if (deleteFetcher.data && typeof deleteFetcher.data === 'object' && 'success' in deleteFetcher.data && deleteFetcher.data.success) {
      setDeletePaymentId(null);
      loadPayments(pagination.currentPage);
    }
  }, [deleteFetcher.data]);

  const handleDelete = (paymentId: string) => {
    const formData = new FormData();
    formData.append("id", paymentId);
    
    deleteFetcher.submit(formData, {
      method: "DELETE",
      action: "/api/payments"
    });
  };

  const handlePageChange = (page: number) => {
    loadPayments(page);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const refreshData = () => {
    loadPayments(pagination.currentPage);
  };

  const isLoading = paymentsFetcher.state === "loading";
  const isDeleting = deleteFetcher.state === "submitting";

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PAID': return 'default';
      case 'PENDING': return 'secondary';
      case 'OVERDUE': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-700 bg-green-50 border-green-200';
      case 'PENDING': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'OVERDUE': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  // Table columns
  const columns: Column<Payment>[] = [
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
      render: (payment) => (
        <div>
          <div className="font-medium text-gray-900">{payment.customer.name}</div>
          {payment.customer.email && (
            <div className="text-sm text-gray-500">{payment.customer.email}</div>
          )}
          {payment.customer.package && (
            <div className="text-xs text-blue-600">{payment.customer.package.name}</div>
          )}
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (payment) => (
        <div className="font-medium">
          Rp {payment.amount.toLocaleString()}
        </div>
      )
    },
    {
      key: 'paymentDate',
      header: 'Payment Date',
      sortable: true,
      render: (payment) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm">
            {format(new Date(payment.paymentDate), "dd MMM yyyy", { locale: id })}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (payment) => (
        <Badge className={getStatusColor(payment.status)}>
          {payment.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (payment) => (
        <ViewEditDeleteMenu
          viewHref={customerId ? undefined : `/customers/${payment.customer.id}`}
          onEdit={() => onEditPayment?.(payment)}
          onDelete={() => setDeletePaymentId(payment.id)}
          canEdit={true}
          canDelete={true}
        />
      )
    }
  ];

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Payment History
          </h3>
          <Badge variant="outline" className="text-xs">
            {pagination.totalCount} payments
          </Badge>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={isLoading}
          className="flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      {!customerId && (
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search customers..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={payments}
        columns={columns}
        loading={isLoading}
        emptyMessage="No payments found"
        pagination={{
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          pageSize: pagination.limit,
          totalItems: pagination.totalCount,
          onPageChange: handlePageChange
        }}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={!!deletePaymentId}
        onClose={() => setDeletePaymentId(null)}
        onConfirm={() => deletePaymentId && handleDelete(deletePaymentId)}
        title="Delete Payment"
        description="Are you sure you want to delete this payment record? This action cannot be undone."
        isLoading={isDeleting}
      />
    </div>
  );
}