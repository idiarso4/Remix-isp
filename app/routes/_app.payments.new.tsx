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

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "payments", "create");

  // Get active customers for selection
  const customers = await db.customer.findMany({
    where: { status: "ACTIVE" },
    include: {
      package: {
        select: { name: true, price: true, duration: true }
      }
    },
    orderBy: { name: "asc" }
  });

  return json({ user, customers });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "payments", "create");

  const formData = await request.formData();
  const customerId = formData.get("customerId")?.toString();
  const amountString = formData.get("amount")?.toString();
  const paymentDateString = formData.get("paymentDate")?.toString();
  const statusString = formData.get("status")?.toString();

  // Validation
  const errors: Record<string, string> = {};
  
  if (!customerId) {
    errors.customerId = "Pelanggan wajib dipilih";
  }

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

    const payment = await db.payment.create({
      data: {
        customerId: customerId!,
        amount,
        paymentDate,
        status,
      },
    });

    return redirect(`/payments/${payment.id}`);
  } catch (error) {
    console.error("Error creating payment:", error);
    return json({ errors: { general: "Terjadi kesalahan saat menyimpan data" } }, { status: 500 });
  }
}

export default function NewPayment() {
  const { user, customers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as { errors?: Record<string, string> } | undefined;
  const navigation = useNavigation();
  
  const isSubmitting = navigation.state === "submitting";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Catat Pembayaran Baru"
        description="Tambahkan catatan pembayaran pelanggan"
      >
        <Button variant="outline" asChild>
          <Link to="/payments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Informasi Pembayaran
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
              <Label htmlFor="customerId">Pelanggan *</Label>
              <Select name="customerId" required>
                <SelectTrigger className={actionData?.errors?.customerId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Pilih pelanggan" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-sm text-gray-500">
                          {customer.email} • {customer.package?.name || 'Tidak ada paket'}
                          {customer.package && (
                            <span className="ml-2 text-green-600">
                              (Rp {Number(customer.package.price).toLocaleString('id-ID')})
                            </span>
                          )}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {actionData?.errors?.customerId && (
                <p className="text-red-500 text-sm">{actionData.errors.customerId}</p>
              )}
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
                    placeholder="150000"
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
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className={actionData?.errors?.paymentDate ? "border-red-500" : ""}
                />
                {actionData?.errors?.paymentDate && (
                  <p className="text-red-500 text-sm">{actionData.errors.paymentDate}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status Pembayaran *</Label>
              <Select name="status" required defaultValue="PAID">
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

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-800 mb-2">Tips Pencatatan Pembayaran:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Pastikan jumlah pembayaran sesuai dengan tagihan pelanggan</li>
                <li>• Gunakan status "Lunas" untuk pembayaran yang sudah dikonfirmasi</li>
                <li>• Gunakan status "Pending" untuk pembayaran yang belum dikonfirmasi</li>
                <li>• Gunakan status "Terlambat" untuk pembayaran yang melewati jatuh tempo</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Button type="button" variant="outline" asChild>
                <Link to="/payments">Batal</Link>
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
                    Simpan
                  </>
                )}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}