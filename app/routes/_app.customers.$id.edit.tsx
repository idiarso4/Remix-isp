import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "@remix-run/react";
import { db } from "~/lib/db.server";
import { CustomerStatus } from "@prisma/client";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "update");

  const customerId = params.id;
  if (!customerId) {
    throw new Response("Customer ID is required", { status: 400 });
  }

  const [customer, packages] = await Promise.all([
    db.customer.findUnique({
      where: { id: customerId },
      include: { package: true }
    }),
    db.package.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    })
  ]);

  if (!customer) {
    throw new Response("Customer not found", { status: 404 });
  }

  return json({ user, customer, packages });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "update");

  const customerId = params.id;
  if (!customerId) {
    throw new Response("Customer ID is required", { status: 400 });
  }

  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const email = formData.get("email")?.toString() || null;
  const phone = formData.get("phone")?.toString() || null;
  const address = formData.get("address")?.toString() || null;
  const location = formData.get("location")?.toString() || null;
  const statusString = formData.get("status")?.toString() || "ACTIVE";
  const packageIdRaw = formData.get("packageId")?.toString();
  const packageId = packageIdRaw === "none" || !packageIdRaw ? null : packageIdRaw;

  // Validation
  const errors: Record<string, string> = {};
  
  if (!name || name.trim().length === 0) {
    errors.name = "Nama pelanggan wajib diisi";
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Format email tidak valid";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    const status = statusString as CustomerStatus;
    
    await db.customer.update({
      where: { id: customerId },
      data: {
        name: name!.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        location: location?.trim() || null,
        status,
        packageId: packageId || null,
      },
    });

    return redirect(`/customers/${customerId}`);
  } catch (error) {
    console.error("Error updating customer:", error);
    return json({ errors: { general: "Terjadi kesalahan saat menyimpan data" } }, { status: 500 });
  }
}

export default function EditCustomer() {
  const { user, customer, packages } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  const isSubmitting = navigation.state === "submitting";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title={`Edit ${customer.name}`}
        description="Ubah informasi pelanggan"
      >
        <Link to={`/customers/${customer.id}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informasi Pelanggan</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            {actionData?.errors?.general && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 text-sm">{actionData.errors.general}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Pelanggan *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  defaultValue={customer.name}
                  placeholder="Masukkan nama pelanggan"
                  className={actionData?.errors && 'name' in actionData.errors ? "border-red-500" : ""}
                />
                {actionData?.errors && 'name' in actionData.errors && (
                  <p className="text-red-500 text-sm">{actionData.errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={customer.email || ""}
                  placeholder="contoh@email.com"
                  className={actionData?.errors && 'email' in actionData.errors ? "border-red-500" : ""}
                />
                {actionData?.errors && 'email' in actionData.errors && (
                  <p className="text-red-500 text-sm">{actionData.errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={customer.phone || ""}
                  placeholder="+62 812 3456 7890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select 
                  name="status" 
                  defaultValue={customer.status}
                  className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Tidak Aktif</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={customer.address || ""}
                placeholder="Masukkan alamat lengkap"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasi/Area</Label>
              <Input
                id="location"
                name="location"
                type="text"
                defaultValue={customer.location || ""}
                placeholder="Contoh: Kecamatan ABC, Kelurahan XYZ"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="packageId">Paket Langganan</Label>
              <select 
                name="packageId" 
                defaultValue={customer.packageId || "none"}
                className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="none">Tidak ada paket</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} - {pkg.speed} - Rp {pkg.price.toLocaleString()}/{pkg.duration === 'MONTHLY' ? 'bulan' : 'tahun'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Link to={`/customers/${customer.id}`}>
                <Button type="button" variant="outline">Batal</Button>
              </Link>
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
    </PageContainer>
  );
}