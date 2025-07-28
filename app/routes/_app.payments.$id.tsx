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
import { ArrowLeft, Edit, CreditCard, User, Calendar, DollarSign, Package, Printer } from "lucide-react";
import { db } from "~/lib/db.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "payments", "read");

  const paymentId = params.id;
  if (!paymentId) {
    throw new Response("Payment ID is required", { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      customer: {
        include: {
          package: {
            select: { name: true, speed: true, price: true, duration: true }
          }
        }
      }
    }
  });

  if (!payment) {
    throw new Response("Payment not found", { status: 404 });
  }

  return json({ user, payment });
}

export default function PaymentDetail() {
  const { user, payment } = useLoaderData<typeof loader>();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PAID': return 'default';
      case 'PENDING': return 'secondary';
      case 'OVERDUE': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID': return 'Lunas';
      case 'PENDING': return 'Pending';
      case 'OVERDUE': return 'Terlambat';
      default: return status;
    }
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title={`Pembayaran ${payment.customer.name}`}
        description={`ID: ${payment.id.slice(-8).toUpperCase()}`}
      >
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>
          
          <Button variant="outline" asChild>
            <Link to="/payments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>
          
          <PermissionGate user={user} resource="payments" action="update">
            <Button asChild>
              <Link to={`/payments/${payment.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </PermissionGate>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Detail Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Jumlah Pembayaran</label>
                  <p className="flex items-center text-2xl font-bold text-green-600">
                    <DollarSign className="mr-1 h-6 w-6" />
                    Rp {Number(payment.amount).toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(payment.status)} className="text-base px-3 py-1">
                      {getStatusText(payment.status)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Tanggal Pembayaran</label>
                  <p className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                    {new Date(payment.paymentDate).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Dicatat Pada</label>
                  <p className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                    {new Date(payment.createdAt).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Receipt */}
          <Card>
            <CardHeader>
              <CardTitle>Kwitansi Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg bg-gray-50">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">KWITANSI PEMBAYARAN</h2>
                  <p className="text-sm text-gray-600">ISP Management System</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Telah terima dari:</p>
                    <p className="font-semibold">{payment.customer.name}</p>
                    {payment.customer.email && (
                      <p className="text-sm text-gray-600">{payment.customer.email}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">No. Kwitansi:</p>
                    <p className="font-mono font-semibold">{payment.id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(payment.paymentDate).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
                
                <div className="border-t border-gray-300 pt-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">Untuk pembayaran:</p>
                  {payment.customer.package ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{payment.customer.package.name}</p>
                        <p className="text-sm text-gray-600">
                          {payment.customer.package.speed} - {payment.customer.package.duration === 'MONTHLY' ? 'Bulanan' : 'Tahunan'}
                        </p>
                      </div>
                      <p className="font-semibold">Rp {Number(payment.amount).toLocaleString('id-ID')}</p>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p>Pembayaran Layanan Internet</p>
                      <p className="font-semibold">Rp {Number(payment.amount).toLocaleString('id-ID')}</p>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-300 pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <p>TOTAL:</p>
                    <p>Rp {Number(payment.amount).toLocaleString('id-ID')}</p>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500">
                    Kwitansi ini sah tanpa tanda tangan dan stempel
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Informasi Pelanggan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-lg">{payment.customer.name}</p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <Link to={`/customers/${payment.customer.id}`}>
                    Lihat Detail Pelanggan
                  </Link>
                </Button>
              </div>
              
              {payment.customer.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p>{payment.customer.email}</p>
                </div>
              )}
              
              {payment.customer.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Telepon</label>
                  <p>{payment.customer.phone}</p>
                </div>
              )}
              
              {payment.customer.location && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Lokasi</label>
                  <p>{payment.customer.location}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Package Information */}
          {payment.customer.package && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Paket Langganan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-lg">{payment.customer.package.name}</p>
                  <p className="text-sm text-gray-500">{payment.customer.package.speed}</p>
                </div>
                
                <div>
                  <p className="text-xl font-bold text-blue-600">
                    Rp {Number(payment.customer.package.price).toLocaleString('id-ID')}
                  </p>
                  <p className="text-sm text-gray-500">
                    per {payment.customer.package.duration === 'MONTHLY' ? 'bulan' : 'tahun'}
                  </p>
                </div>
                
                <div className="pt-2">
                  <Badge variant={payment.amount.toString() === payment.customer.package.price.toString() ? 'default' : 'secondary'}>
                    {payment.amount.toString() === payment.customer.package.price.toString() ? 'Pembayaran Penuh' : 'Pembayaran Parsial'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">ID Pembayaran</span>
                <span className="font-mono text-sm">{payment.id.slice(-8).toUpperCase()}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Metode</span>
                <span className="text-sm">Transfer Bank</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Periode</span>
                <span className="text-sm">
                  {new Date(payment.paymentDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>Rp {Number(payment.amount).toLocaleString('id-ID')}</span>
                </div>
              </div>
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