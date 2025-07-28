import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { PermissionGate } from "~/components/permission-gate";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, Edit, Wifi, DollarSign, Users, Calendar, Clock } from "lucide-react";
import { db } from "~/lib/db.server";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "packages", "read");

  const packageId = params.id;
  if (!packageId) {
    throw new Response("Package ID is required", { status: 400 });
  }

  const packageData = await db.package.findUnique({
    where: { id: packageId },
    include: {
      customers: {
        orderBy: { name: "asc" },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true
        }
      },
      _count: {
        select: { customers: true }
      }
    }
  });

  if (!packageData) {
    throw new Response("Package not found", { status: 404 });
  }

  return json({ user, package: packageData });
}

export default function PackageDetail() {
  const { user, package: pkg } = useLoaderData<typeof loader>();

  return (
    <PageContainer className="py-8">
      <PageHeader
        title={pkg.name}
        description="Detail informasi paket internet"
      >
        <div className="flex items-center space-x-3">
          <Button variant="outline" asChild>
            <Link to="/packages">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>
          
          <PermissionGate user={user} resource="packages" action="update">
            <Button asChild>
              <Link to={`/packages/${pkg.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </PermissionGate>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wifi className="mr-2 h-5 w-5" />
                Informasi Paket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nama Paket</label>
                  <p className="text-lg font-semibold">{pkg.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={pkg.isActive ? 'default' : 'secondary'}>
                      {pkg.isActive ? 'Aktif' : 'Tidak Aktif'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Kecepatan</label>
                  <p className="flex items-center">
                    <Wifi className="mr-2 h-4 w-4 text-blue-500" />
                    {pkg.speed}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Durasi</label>
                  <p className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-gray-400" />
                    {pkg.duration === 'MONTHLY' ? 'Bulanan' : 'Tahunan'}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Harga</label>
                <p className="flex items-center text-2xl font-bold text-green-600">
                  <DollarSign className="mr-1 h-6 w-6" />
                  Rp {pkg.price.toLocaleString('id-ID')}
                  <span className="text-sm text-gray-500 ml-2">
                    per {pkg.duration === 'MONTHLY' ? 'bulan' : 'tahun'}
                  </span>
                </p>
              </div>
              
              {pkg.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Deskripsi</label>
                  <p className="text-gray-700 mt-1">{pkg.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Pelanggan ({pkg._count.customers})
                </span>
                {pkg.customers.length < pkg._count.customers && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/customers?package=${pkg.id}`}>
                      Lihat Semua
                    </Link>
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pkg.customers.length > 0 ? (
                <div className="space-y-3">
                  {pkg.customers.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-500">
                          {customer.email || 'Tidak ada email'} • 
                          Bergabung {format(new Date(customer.createdAt), "dd MMM yyyy", { locale: id })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={customer.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {customer.status}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/customers/${customer.id}`}>
                            Lihat
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Belum ada pelanggan</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistik</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Pelanggan</span>
                <span className="text-2xl font-bold text-blue-600">{pkg._count.customers}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Pendapatan Bulanan</span>
                <span className="text-lg font-semibold text-green-600">
                  Rp {(pkg.price * (pkg.duration === 'MONTHLY' ? pkg._count.customers : pkg._count.customers / 12)).toLocaleString('id-ID')}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Pendapatan Tahunan</span>
                <span className="text-lg font-semibold text-green-600">
                  Rp {(pkg.price * (pkg.duration === 'YEARLY' ? pkg._count.customers : pkg._count.customers * 12)).toLocaleString('id-ID')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Package Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Informasi Sistem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Dibuat</label>
                <p>{format(new Date(pkg.createdAt), "dd MMMM yyyy", { locale: id })}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Terakhir Diupdate</label>
                <p>{format(new Date(pkg.updatedAt), "dd MMMM yyyy", { locale: id })}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}