import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { PermissionGate } from "~/components/permission-gate";
import { Button } from "~/components/ui/button";
import { StatusBadge } from "~/components/ui/status-badge";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ArrowLeft, Edit, Phone, Mail, MapPin, Package, Calendar, CreditCard, Printer } from "lucide-react";
import { db } from "~/lib/db.server";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "read");

  const customerId = params.id;
  if (!customerId) {
    throw new Response("Customer ID is required", { status: 400 });
  }

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: {
      package: true,
      tickets: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          assignedTo: {
            select: { name: true }
          }
        }
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 5
      }
    }
  });

  if (!customer) {
    throw new Response("Customer not found", { status: 404 });
  }

  return json({ user, customer });
}

export default function CustomerDetail() {
  const { user, customer } = useLoaderData<typeof loader>();

  return (
    <PageContainer className="py-8">
      <PageHeader
        title={customer.name}
        description="Detail informasi pelanggan"
      >
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>
          
          <Button variant="outline" asChild>
            <Link to="/customers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>
          
          <PermissionGate user={user} resource="customers" action="update">
            <Button asChild>
              <Link to={`/customers/${customer.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </PermissionGate>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                Informasi Kontak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nama</label>
                  <p className="text-lg font-semibold">{customer.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <StatusBadge status={customer.status} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-gray-400" />
                    {customer.email || "Tidak ada email"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Telepon</label>
                  <p className="flex items-center">
                    <Phone className="mr-2 h-4 w-4 text-gray-400" />
                    {customer.phone || "Tidak ada telepon"}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Alamat</label>
                <p className="flex items-start">
                  <MapPin className="mr-2 h-4 w-4 text-gray-400 mt-1" />
                  {customer.address || "Tidak ada alamat"}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Lokasi</label>
                <p>{customer.location || "Tidak ada lokasi"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card>
            <CardHeader>
              <CardTitle>Tiket Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.tickets.length > 0 ? (
                <div className="space-y-3">
                  {customer.tickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{ticket.title}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(ticket.createdAt), "dd MMM yyyy", { locale: id })}
                          {ticket.assignedTo && ` • ${ticket.assignedTo.name}`}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={ticket.status === 'RESOLVED' ? 'default' : 'secondary'}>
                          {ticket.status}
                        </Badge>
                        <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'URGENT' ? 'destructive' : 'outline'}>
                          {ticket.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/tickets?customer=${customer.id}`}>
                      Lihat Semua Tiket
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Belum ada tiket</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Package Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Paket Langganan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.package ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{customer.package.name}</p>
                    <p className="text-sm text-gray-500">{customer.package.speed}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      Rp {customer.package.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      per {customer.package.duration === 'MONTHLY' ? 'bulan' : 'tahun'}
                    </p>
                  </div>
                  {customer.package.description && (
                    <p className="text-sm text-gray-600">{customer.package.description}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Belum ada paket</p>
              )}
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Informasi Akun
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Bergabung</label>
                <p>{format(new Date(customer.createdAt), "dd MMMM yyyy", { locale: id })}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Terakhir Diupdate</label>
                <p>{format(new Date(customer.updatedAt), "dd MMMM yyyy", { locale: id })}</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Pembayaran Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.payments.length > 0 ? (
                <div className="space-y-3">
                  {customer.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Rp {payment.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(payment.paymentDate), "dd MMM yyyy", { locale: id })}
                        </p>
                      </div>
                      <Badge variant={payment.status === 'PAID' ? 'default' : payment.status === 'PENDING' ? 'secondary' : 'destructive'}>
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Belum ada pembayaran</p>
              )}
            </CardContent>
          </Card>
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