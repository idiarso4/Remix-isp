import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useFetcher, useSearchParams, useNavigate } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { PermissionGate } from "~/components/permission-gate";
import { usePermissions } from "~/lib/hooks/use-permissions";
import { Button } from "~/components/ui/button";
import { StatusBadge } from "~/components/ui/status-badge";
import { DataTable, type Column } from "~/components/tables/data-table";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { SearchFilter, type FilterOption } from "~/components/ui/search-filter";
import { DeleteConfirmDialog } from "~/components/ui/confirm-dialog";
import { Plus, Edit, Trash2, Eye, Printer } from "lucide-react";
import { QuickExportButton } from "~/components/ui/export-button";
import { db } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);

  // Require permission to read customers
  requirePermission(user, 'customers', 'read');

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }

  const customers = await db.customer.findMany({
    where,
    include: {
      package: true,
    },
    orderBy: { name: "asc" },
  });

  return json({ user, customers });
}

// Customer list page - enhanced with new UI components
export default function CustomersIndex() {
  const { user, customers } = useLoaderData<typeof loader>();
  const permissions = usePermissions(user);
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
        { value: 'ACTIVE', label: 'Aktif' },
        { value: 'INACTIVE', label: 'Tidak Aktif' },
        { value: 'SUSPENDED', label: 'Suspended' }
      ]
    }
  ];

  // Table columns
  const columns: Column<typeof customers[0]>[] = [
    {
      key: 'name',
      header: 'Nama',
      sortable: true,
      render: (customer) => (
        <div>
          <div className="font-medium text-gray-900">{customer.name}</div>
          <div className="text-sm text-gray-500">{customer.email || 'Tidak ada email'}</div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Telepon',
      render: (customer) => customer.phone || '-'
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (customer) => <StatusBadge status={customer.status} />
    },
    {
      key: 'package',
      header: 'Paket',
      render: (customer) => customer.package?.name || 'Tidak ada paket'
    },
    {
      key: 'location',
      header: 'Lokasi',
      render: (customer) => customer.location || '-'
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'w-32',
      render: (customer) => (
        <div className="flex items-center space-x-1">
          <Link to={`/customers/${customer.id}`} title="Lihat Detail">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>

          <PermissionGate user={user} resource="customers" action="update">
            <Link to={`/customers/${customer.id}/edit`} title="Edit Pelanggan">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </PermissionGate>

          <PermissionGate user={user} resource="customers" action="delete">
            <DeleteConfirmDialog
              itemName={customer.name}
              onConfirm={() => {
                deleteFetcher.submit(
                  { _method: "DELETE", id: customer.id },
                  { method: "post", action: "/api/customers" }
                );
              }}
            >
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:border-red-300" title="Hapus Pelanggan">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DeleteConfirmDialog>
          </PermissionGate>
        </div>
      )
    }
  ];

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Manajemen Pelanggan"
        description="Kelola data pelanggan WiFi dan status langganan"
      >
        <div className="flex items-center space-x-3">
          <QuickExportButton
            type="customers"
            data={customers}
            className="print:hidden"
          />

          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>

          <PermissionGate user={user} resource="customers" action="create">
            <Link to="/customers/new">
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 print:hidden">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pelanggan
              </Button>
            </Link>
          </PermissionGate>
        </div>
      </PageHeader>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <SearchFilter
            searchPlaceholder="Cari pelanggan..."
            filters={filterOptions}
            className="mb-6 print:hidden"
            searchValue={searchParams.get('search') || ''}
            filterValues={{
              status: searchParams.get('status') || ''
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
              navigate('/customers');
            }}
          />

          <div className="overflow-x-auto">
            <DataTable
              data={customers}
              columns={columns}
              searchable={false} // We're using the separate SearchFilter component
              sortable={true}
              emptyMessage="Tidak ada data pelanggan"
              pagination={{
                currentPage: 1,
                totalPages: 1,
                pageSize: 10,
                totalItems: customers.length,
                onPageChange: (page) => console.log('Page changed:', page)
              }}
            />
          </div>
        </div>


      </div>

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