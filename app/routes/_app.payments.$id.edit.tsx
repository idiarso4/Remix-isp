import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, Save, CreditCard } from "lucide-react";
import { Link } from "@remix-run/react";
import { db } from "~/lib/db.server";
import { PaymentStatus } from "@prisma/client";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "payments", "update");

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
            select: { name: true, price: true, duration: true }
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

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "payments", "update");

  const paymentId = params.id;
  if (!paymentId) {
    throw new Response("Payment ID is required", { status: 400 });
  }

  const formData = await request.formData();
  const amountString = formData.get("amount")?.toString();
  const paymentDateString = formData.get("paymentDate")?.toString();
  const statusString = formData.get("status")?.toString();

  // Validation
  const errors: Record<string, string> = {};
  
  if (!amountString) {
    errors.amount = "Jumlah pembayaran wajib diisi";
  } else {
    const amount = parseFloat(amountString);
    if (isNaN(amount) || amount <= 0) {
      errors.amount = "Jumlah pembayaran harus berupa angka positif";
    }
  }

  if (!paymentDateString) {
    errors.paymentDate = "Tanggal pembayaran wajib diisi";
  }

  if (!statusString) {
    errors.status = "Status pembayaran wajib dipilih";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    const amount = parseFloat(amountString!);
    const paymentDate = new Date(paymentDateString!);
    const status = statusString as PaymentStatus;

    await db.payment.update({
      where: { id: paymentId },
      data: {
        amount,
        paymentDate,
        status,
      },
    });

    return redirect(`/payments/${paymentId}`);
  } catch (error) {
    console.error("Error updating payment:", error);
    return json({ errors: { general: "Terjadi kesalahan saat menyimpan data" } }, { status: 500 });
  }
}

export default function EditPayment() {
  const { user, payment } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as { errors?: Record<string, string> } | undefined;
  const navigation = useNavigation();
  
  const isSubmitting = navigation.state === "submitting";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title={`Edit Pembayaran ${payment.customer.name}`}
        description="Ubah informasi pembayaran"
      >
        <Button variant="outline" asChild>
          <Link to={`/payments/${payment.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Edit Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-6">
                {actionData?.errors?.general && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800 text-sm">{actionData.errors.general}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="customer">Pelanggan</Label>
                  <Input
                    id="customer"
                    type="text"
                    value={payment.customer.name}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-sm text-gray-500">Pelanggan tidak dapat diubah</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Jumlah Pembayaran *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        required
                        min="0"
                        step="1000"
                        defaultValue={payment.amount.toString()}
                        className={`pl-10 ${actionData?.errors?.amount ? "border-red-500" : ""}`}
                      />
                    </div>
                    {actionData?.errors?.amount && (
                      <p className="text-red-500 text-sm">{actionData.errors.amount}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Tanggal Pembayaran *</Label>
                    <Input
                      id="paymentDate"
                      name="paymentDate"
                      type="date"
                      required
                      defaultValue={new Date(payment.paymentDate).toISOString().split('T')[0]}
                      className={actionData?.errors?.paymentDate ? "border-red-500" : ""}
                    />
                    {actionData?.errors?.paymentDate && (
                      <p className="text-red-500 text-sm">{actionData.errors.paymentDate}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status Pembayaran *</Label>
                  <Select name="status" required defaultValue={payment.status}>
                    <SelectTrigger className={actionData?.errors?.status ? "border-red-500" : ""}>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAID">Lunas</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="OVERDUE">Terlambat</SelectItem>
                    </SelectContent>
                  </Select>
                  {actionData?.errors?.status && (
                    <p className="text-red-500 text-sm">{actionData.errors.status}</p>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                  <h4 className="font-medium text-amber-800 mb-2">Perhatian:</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Perubahan status pembayaran akan mempengaruhi laporan keuangan</li>
                    <li>• Pastikan tanggal pembayaran sesuai dengan bukti transfer</li>
                    <li>• Jumlah pembayaran sebaiknya sesuai dengan tagihan paket</li>
                  </ul>
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <Button type="button" variant="outline" asChild>
                    <Link to={`/payments/${payment.id}`}>Batal</Link>
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Perubahan
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Customer & Package Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Pelanggan</CardTitle>
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
            </CardContent>
          </Card>

          {payment.customer.package && (
            <Card>
              <CardHeader>
                <CardTitle>Paket Langganan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold">{payment.customer.package.name}</p>
                  <p className="text-sm text-gray-500">
                    {payment.customer.package.duration === 'MONTHLY' ? 'Bulanan' : 'Tahunan'}
                  </p>
                </div>
                
                <div>
                  <p className="text-lg font-bold text-blue-600">
                    Rp {Number(payment.customer.package.price).toLocaleString('id-ID')}
                  </p>
                  <p className="text-sm text-gray-500">Harga paket</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>ID Pembayaran:</span>
                  <span className="font-mono">{payment.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Dicatat:</span>
                  <span>{new Date(payment.createdAt).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Terakhir Update:</span>
                  <span>{new Date(payment.updatedAt).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}