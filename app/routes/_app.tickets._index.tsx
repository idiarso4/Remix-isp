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
import { Plus, Edit, Trash2, Eye, AlertCircle, Clock, CheckCircle, Printer } from "lucide-react";
import { QuickExportButton } from "~/components/ui/export-button";
import { db } from "~/lib/db.server";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "read");

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const assignedTo = url.searchParams.get("assignedTo");

  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }
  if (priority && priority !== "all") {
    where.priority = priority.toUpperCase();
  }
  if (assignedTo && assignedTo !== "all") {
    if (assignedTo === "unassigned") {
      where.assignedToId = null;
    } else {
      where.assignedToId = assignedTo;
    }
  }

  const [tickets, employees] = await Promise.all([
    db.ticket.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" }
      ],
    }),
    db.employee.findMany({
      where: { canHandleTickets: true, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  return json({ user, tickets, employees });
}

export default function TicketsIndex() {
  const { user, tickets, employees } = useLoaderData<typeof loader>();
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
        { value: 'all', label: 'Semua Status' },
        { value: 'OPEN', label: 'Terbuka' },
        { value: 'IN_PROGRESS', label: 'Dalam Proses' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'RESOLVED', label: 'Selesai' },
        { value: 'CLOSED', label: 'Ditutup' }
      ]
    },
    {
      key: 'priority',
      label: 'Prioritas',
      type: 'select',
      options: [
        { value: 'all', label: 'Semua Prioritas' },
        { value: 'URGENT', label: 'Mendesak' },
        { value: 'HIGH', label: 'Tinggi' },
        { value: 'MEDIUM', label: 'Sedang' },
        { value: 'LOW', label: 'Rendah' }
      ]
    },
    {
      key: 'assignedTo',
      label: 'Teknisi',
      type: 'select',
      options: [
        { value: 'all', label: 'Semua Teknisi' },
        { value: 'unassigned', label: 'Belum Ditugaskan' },
        ...employees.map(emp => ({ value: emp.id, label: emp.name }))
      ]
    }
  ];

  // Priority badge variant
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  // Status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'destructive';
      case 'IN_PROGRESS': return 'default';
      case 'PENDING': return 'secondary';
      case 'RESOLVED': return 'outline';
      case 'CLOSED': return 'outline';
      default: return 'outline';
    }
  };

  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <AlertCircle className="h-4 w-4" />;
      case 'IN_PROGRESS': return <Clock className="h-4 w-4" />;
      case 'RESOLVED': return <CheckCircle className="h-4 w-4" />;
      case 'CLOSED': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Table columns
  const columns: Column<typeof tickets[0]>[] = [
    {
      key: 'title',
      header: 'Tiket',
      sortable: true,
      render: (ticket) => (
        <div>
          <div className="font-medium text-gray-900">{ticket.title}</div>
          <div className="text-sm text-gray-500">
            {ticket.customer.name} • {format(new Date(ticket.createdAt), "dd MMM yyyy", { locale: id })}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (ticket) => (
        <Badge variant={getStatusVariant(ticket.status)} className="flex items-center w-fit">
          {getStatusIcon(ticket.status)}
          <span className="ml-1">{ticket.status.replace('_', ' ')}</span>
        </Badge>
      )
    },
    {
      key: 'priority',
      header: 'Prioritas',
      sortable: true,
      render: (ticket) => (
        <Badge variant={getPriorityVariant(ticket.priority)}>
          {ticket.priority}
        </Badge>
      )
    },
    {
      key: 'category',
      header: 'Kategori',
      render: (ticket) => (
        <span className="text-sm">
          {ticket.category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      )
    },
    {
      key: 'assignedTo',
      header: 'Teknisi',
      render: (ticket) => (
        <span className="text-sm">
          {ticket.assignedTo?.name || 'Belum ditugaskan'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (ticket) => (
        <div className="flex items-center space-x-2">
          <Link to={`/tickets/${ticket.id}`} title="Lihat Detail">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>

          <PermissionGate user={user} resource="tickets" action="update">
            <Link to={`/tickets/${ticket.id}/edit`} title="Edit Tiket">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </PermissionGate>

          <PermissionGate user={user} resource="tickets" action="delete">
            <DeleteConfirmDialog
              itemName={ticket.title}
              onConfirm={() => {
                deleteFetcher.submit(
                  { _method: "DELETE", id: ticket.id },
                  { method: "post", action: "/api/tickets" }
                );
              }}
            >
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:border-red-300" title="Hapus Tiket">
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
    total: tickets.length,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED').length,
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Manajemen Tiket"
        description="Kelola tiket layanan pelanggan dan penugasan teknisi"
      >
        <div className="flex items-center space-x-3">
          <QuickExportButton
            type="tickets"
            data={tickets}
            className="print:hidden"
          />

          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>

          <PermissionGate user={user} resource="tickets" action="read">
            <Link to="/tickets/workload">
              <Button variant="outline" className="print:hidden">
                <Clock className="mr-2 h-4 w-4" />
                Workload
              </Button>
            </Link>
          </PermissionGate>

          <PermissionGate user={user} resource="tickets" action="create">
            <Link to="/tickets/new">
              <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 print:hidden">
                <Plus className="mr-2 h-4 w-4" />
                Buat Tiket
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
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Tiket</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Terbuka</p>
              <p className="text-2xl font-bold text-red-600">{stats.open}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Dalam Proses</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Selesai</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <SearchFilter
            searchPlaceholder="Cari tiket..."
            filters={filterOptions}
            className="mb-6 print:hidden"
            searchValue={searchParams.get('search') || ''}
            filterValues={{
              status: searchParams.get('status') || '',
              priority: searchParams.get('priority') || '',
              assignedTo: searchParams.get('assignedTo') || ''
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
              navigate('/tickets');
            }}
          />

          <DataTable
            data={tickets}
            columns={columns}
            searchable={false}
            sortable={true}
            emptyMessage="Tidak ada data tiket"
            pagination={{
              currentPage: 1,
              totalPages: 1,
              pageSize: 10,
              totalItems: tickets.length,
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