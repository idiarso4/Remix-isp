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
import { Plus, Edit, Trash2, Eye, User, Users, Printer } from "lucide-react";
import { QuickExportButton } from "~/components/ui/export-button";
import { db } from "~/lib/db.server";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "employees", "read");
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");
  const division = url.searchParams.get("division");

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { position: { contains: search, mode: "insensitive" } },
      { division: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role && role !== "all") {
    where.role = role.toUpperCase();
  }
  if (status && status !== "all") {
    where.isActive = status === "active";
  }
  if (division && division !== "all") {
    where.division = division;
  }

  const employees = await db.employee.findMany({
    where,
    include: {
      user: {
        select: { email: true }
      },
      assignedTickets: {
        where: {
          status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] }
        },
        select: { id: true }
      },
      performanceMetrics: {
        select: {
          totalTicketsResolved: true,
          averageResolutionTime: true,
          customerRating: true
        }
      }
    },
    orderBy: { name: "asc" },
  });

  // Get unique divisions for filter
  const divisions = await db.employee.findMany({
    select: { division: true },
    distinct: ["division"],
    where: { division: { not: null } }
  });
  
  return json({ user, employees, divisions: divisions.map(d => d.division).filter(Boolean) });
}

export default function EmployeesIndex() {
  const { user, employees, divisions } = useLoaderData<typeof loader>();
  const deleteFetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filter options
  const filterOptions: FilterOption[] = [
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { value: 'all', label: 'Semua Role' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'TECHNICIAN', label: 'Teknisi' },
        { value: 'MARKETING', label: 'Marketing' },
        { value: 'HR', label: 'HR' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'Semua Status' },
        { value: 'active', label: 'Aktif' },
        { value: 'inactive', label: 'Tidak Aktif' }
      ]
    },
    {
      key: 'division',
      label: 'Divisi',
      type: 'select',
      options: [
        { value: 'all', label: 'Semua Divisi' },
        ...divisions.map(div => ({ value: div, label: div }))
      ]
    }
  ];

  // Role badge variant
  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive';
      case 'TECHNICIAN': return 'default';
      case 'MARKETING': return 'secondary';
      case 'HR': return 'outline';
      default: return 'outline';
    }
  };

  // Table columns
  const columns: Column<typeof employees[0]>[] = [
    {
      key: 'name',
      header: 'Karyawan',
      sortable: true,
      render: (employee) => (
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
            {employee.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-gray-500" />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{employee.name}</div>
            <div className="text-sm text-gray-500">{employee.user?.email || 'Tidak ada email'}</div>
          </div>
        </div>
      )
    },
    {
      key: 'position',
      header: 'Posisi',
      render: (employee) => (
        <div>
          <div className="font-medium">{employee.position || '-'}</div>
          <div className="text-sm text-gray-500">{employee.division || '-'}</div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (employee) => (
        <Badge variant={getRoleVariant(employee.role)}>
          {employee.role}
        </Badge>
      )
    },
    {
      key: 'tickets',
      header: 'Tiket Aktif',
      render: (employee) => (
        <span className="text-sm">
          {employee.assignedTickets.length} tiket
          {employee.canHandleTickets && (
            <span className="text-gray-500 ml-1">
              / {employee.maxConcurrentTickets} max
            </span>
          )}
        </span>
      )
    },
    {
      key: 'performance',
      header: 'Performa',
      render: (employee) => (
        <div className="text-sm">
          {employee.performanceMetrics ? (
            <>
              <div>{employee.performanceMetrics.totalTicketsResolved} selesai</div>
              <div className="text-gray-500">
                {employee.performanceMetrics.customerRating.toFixed(1)}/5 ⭐
              </div>
            </>
          ) : (
            <span className="text-gray-500">Belum ada data</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (employee) => (
        <div className="flex flex-col space-y-1">
          <Badge variant={employee.isActive ? 'default' : 'secondary'}>
            {employee.isActive ? 'Aktif' : 'Tidak Aktif'}
          </Badge>
          {employee.canHandleTickets && (
            <Badge variant="outline" className="text-xs">
              {employee.handlingStatus}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (employee) => (
        <div className="flex items-center space-x-2">
          <Link to={`/employees/${employee.id}`} title="Lihat Detail">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          
          <PermissionGate user={user} resource="employees" action="update">
            <Link to={`/employees/${employee.id}/edit`} title="Edit Karyawan">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </PermissionGate>
          
          <PermissionGate user={user} resource="employees" action="delete">
            <DeleteConfirmDialog
              itemName={employee.name}
              onConfirm={() => {
                deleteFetcher.submit(
                  { _method: "DELETE", id: employee.id },
                  { method: "post", action: "/api/employees" }
                );
              }}
              disabled={employee.assignedTickets.length > 0}
              disabledMessage={`Tidak dapat menghapus karyawan yang masih menangani ${employee.assignedTickets.length} tiket aktif`}
            >
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:border-red-300"
                disabled={employee.assignedTickets.length > 0}
                title={employee.assignedTickets.length > 0 ? `Tidak dapat menghapus karyawan yang masih menangani ${employee.assignedTickets.length} tiket aktif` : "Hapus Karyawan"}
              >
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
    total: employees.length,
    active: employees.filter(e => e.isActive).length,
    technicians: employees.filter(e => e.role === 'TECHNICIAN').length,
    admins: employees.filter(e => e.role === 'ADMIN').length,
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Manajemen Karyawan"
        description="Kelola data karyawan dan hak akses sistem"
      >
        <div className="flex items-center space-x-3">
          <QuickExportButton 
            type="employees" 
            data={employees} 
            className="print:hidden"
          />
          
          <Button variant="outline" onClick={handlePrint} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>
          
          <PermissionGate user={user} resource="employees" action="create">
            <Link to="/employees/new">
              <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 print:hidden">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Karyawan
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
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Karyawan</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Aktif</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <User className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Teknisi</p>
              <p className="text-2xl font-bold text-orange-600">{stats.technicians}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <User className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Admin</p>
              <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 print:p-4">
          <SearchFilter
            searchPlaceholder="Cari karyawan..."
            filters={filterOptions}
            className="mb-6 print:hidden"
            searchValue={searchParams.get('search') || ''}
            filterValues={{
              role: searchParams.get('role') || '',
              status: searchParams.get('status') || '',
              division: searchParams.get('division') || ''
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
              navigate('/employees');
            }}
          />
          
          <DataTable
            data={employees}
            columns={columns}
            searchable={false}
            sortable={true}
            emptyMessage="Tidak ada data karyawan"
            pagination={{
              currentPage: 1,
              totalPages: 1,
              pageSize: 10,
              totalItems: employees.length,
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