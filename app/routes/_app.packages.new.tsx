import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

import { Checkbox } from "~/components/ui/checkbox";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "@remix-run/react";
import { db } from "~/lib/db.server";
import { Duration } from "@prisma/client";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "packages", "create");

  return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "packages", "create");

  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const speed = formData.get("speed")?.toString();
  const priceString = formData.get("price")?.toString();
  const durationString = formData.get("duration")?.toString();
  const description = formData.get("description")?.toString() || null;
  const isActiveString = formData.get("isActive")?.toString();

  // Validation
  const errors: Record<string, string> = {};
  
  if (!name || name.trim().length === 0) {
    errors.name = "Nama paket wajib diisi";
  }

  if (!speed || speed.trim().length === 0) {
    errors.speed = "Kecepatan wajib diisi";
  }

  if (!priceString) {
    errors.price = "Harga wajib diisi";
  } else {
    const price = parseFloat(priceString);
    if (isNaN(price) || price <= 0) {
      errors.price = "Harga harus berupa angka positif";
    }
  }

  if (!durationString) {
    errors.duration = "Durasi wajib dipilih";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    const price = parseFloat(priceString!);
    const duration = durationString as Duration;
    const isActive = isActiveString === "on";
    
    const packageData = await db.package.create({
      data: {
        name: name!.trim(),
        speed: speed!.trim(),
        price,
        duration,
        description: description?.trim() || null,
        isActive,
      },
    });

    return redirect(`/packages/${packageData.id}`);
  } catch (error) {
    console.error("Error creating package:", error);
    return json({ errors: { general: "Terjadi kesalahan saat menyimpan data" } }, { status: 500 });
  }
}

export default function NewPackage() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  const isSubmitting = navigation.state === "submitting";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Tambah Paket Baru"
        description="Buat paket internet baru untuk pelanggan"
      >
        <Link to="/packages">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informasi Paket</CardTitle>
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
                <Label htmlFor="name">Nama Paket *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Contoh: Basic 10 Mbps"
                  className={actionData?.errors && 'name' in actionData.errors ? "border-red-500" : ""}
                />
                {actionData?.errors && 'name' in actionData.errors && (
                  <p className="text-red-500 text-sm">{actionData.errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="speed">Kecepatan *</Label>
                <Input
                  id="speed"
                  name="speed"
                  type="text"
                  required
                  placeholder="Contoh: 10 Mbps, 25 Mbps, Unlimited"
                  className={actionData?.errors && 'speed' in actionData.errors ? "border-red-500" : ""}
                />
                {actionData?.errors && 'speed' in actionData.errors && (
                  <p className="text-red-500 text-sm">{actionData.errors.speed}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Harga *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    required
                    min="0"
                    step="1000"
                    placeholder="150000"
                    className={`pl-10 ${actionData?.errors && 'price' in actionData.errors ? "border-red-500" : ""}`}
                  />
                </div>
                {actionData?.errors && 'price' in actionData.errors && (
                  <p className="text-red-500 text-sm">{actionData.errors.price}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Durasi *</Label>
                <select 
                  name="duration" 
                  required
                  className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${actionData?.errors && 'duration' in actionData.errors ? "border-red-500" : ""}`}
                >
                  <option value="">Pilih durasi</option>
                  <option value="MONTHLY">Bulanan</option>
                  <option value="YEARLY">Tahunan</option>
                </select>
                {actionData?.errors && 'duration' in actionData.errors && (
                  <p className="text-red-500 text-sm">{actionData.errors.duration}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Deskripsi paket (opsional)"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="isActive" name="isActive" defaultChecked />
              <Label htmlFor="isActive">Paket aktif dan tersedia untuk pelanggan</Label>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Link to="/packages">
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