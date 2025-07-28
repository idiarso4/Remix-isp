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
import { Plus, Edit, Trash2, Eye, Wifi, DollarSign, Printer } from "lucide-react";
import { QuickExportButton } from "~/components/ui/export-button";
import { db } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "packages", "read");
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { speed: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status && status !== "all") {
    where.isActive = status === "active";
  }

  const packages = await db.package.findMany({
    where,
    include: {
      _count: {
        select: { customers: true }
      }
    },
    orderBy: { name: "asc" },
  });
  
  return json({ user, packages });
}

export default function PackagesIndex() {
  const { user, packages } = useLoaderData<typeof loader>();
  const deleteFetcher = useFetcher();

  // Filter options
  const filterOptions: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'Semua Status' },
        { value: 'active', label: 'Aktif' },
        { value: 'inactive', label: 'Tidak Aktif' }
      ]
    }
  ];

  // Table columns
  const columns: Column<typeof packages[0]>[] = [
    {
      key: 'name',
      header: 'Nama Paket',
      sortable: true,
      render: (pkg) => (
        <div>
          <div className="font-medium text-gray-900 flex items-center">
            <Wifi className="mr-2 h-4 w-4 text-blue-500" />
            {pkg.name}
          </div>
          <div className="text-sm text-gray-500">{pkg.speed}</div>
        </div>
      )
    },
    {
      key: 'price',
      header: 'Harga',
      sortable: true,
      render: (pkg) => (
        <div className="flex items-center">
          <DollarSign className="mr-1 h-4 w-4 text-green-500" />
          <span className="font-semibold text-green-600">
            Rp {pkg.price.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500 ml-1">
            /{pkg.duration === 'MONTHLY' ? 'bulan' : 'tahun'}
          </span>
        </div>
      )
    },
    {
      key: 'duration',
      header: 'Durasi',
      render: (pkg) => (
        <Badge variant="outline">
          {pkg.duration === 'MONTHLY' ? 'Bulanan' : 'Tahunan'}
        </Badge>
      )
    },
    {
      key: 'customers',
      header: 'Pelanggan',
      render: (pkg) => (
        <span className="text-sm font-medium">
          {pkg._count.customers} pelanggan
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (pkg) => (
        <Badge variant={pkg.isActive ? 'default' : 'secondary'}>
          {pkg.isActive ? 'Aktif' : 'Tidak Aktif'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (pkg) => (
        <div className="flex items-center space-x-2">
          <Link to={`/packages/${pkg.id}`} title="Lihat Detail">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          
          <PermissionGate user={user} resource="packages" action="update">
            <Link to={`/packages/${pkg.id}/edit`} title="Edit Paket">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </PermissionGate>
          
          <PermissionGate user={user} resource="packages" action="delete">
            <DeleteConfirmDialog
              itemName={pkg.name}
              onConfirm={() => {
                deleteFetcher.submit(
                  { _method: "DELETE", id: pkg.id },
                  { method: "post", action: "/api/packages" }
                );
              }}
              disabled={pkg._count.customers > 0}
              disabledMessage={`Tidak dapat menghapus paket yang masih digunakan oleh ${pkg._count.customers} pelanggan`}
            >
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:border-red-300"
                disabled={pkg._count.customers > 0}
                title={pkg._count.customers > 0 ? `Tidak dapat menghapus paket yang masih digunakan oleh ${pkg._count.customers} pelanggan` : "Hapus Paket"}
              >
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
        title="Manajemen Paket Internet"
        description="Kelola paket layanan internet dan harga"
      >
        <div className="flex items-center space-x-3">
          <QuickExportButton 
            type="packages" 
            data={packages} 
            className="print:hidden"
          />
          
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>
          
          <PermissionGate user={user} resource="packages" action="create">
            <Link to="/packages/new">
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 print:hidden">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Paket
              </Button>
            </Link>
          </PermissionGate>
        </div>
      </PageHeader>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <SearchFilter
            searchPlaceholder="Cari paket..."
            filters={filterOptions}
            className="mb-6 print:hidden"
          />
          
          <DataTable
            data={packages}
            columns={columns}
            searchable={false}
            sortable={true}
            emptyMessage="Tidak ada data paket"
            pagination={{
              currentPage: 1,
              totalPages: 1,
              pageSize: 10,
              totalItems: packages.length,
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