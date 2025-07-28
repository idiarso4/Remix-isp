import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "@remix-run/react";
import { db } from "~/lib/db.server";
import { Duration } from "@prisma/client";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "packages", "update");

  const packageId = params.id;
  if (!packageId) {
    throw new Response("Package ID is required", { status: 400 });
  }

  const packageData = await db.package.findUnique({
    where: { id: packageId },
    include: {
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

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "packages", "update");

  const packageId = params.id;
  if (!packageId) {
    throw new Response("Package ID is required", { status: 400 });
  }

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
    
    await db.package.update({
      where: { id: packageId },
      data: {
        name: name!.trim(),
        speed: speed!.trim(),
        price,
        duration,
        description: description?.trim() || null,
        isActive,
      },
    });

    return redirect(`/packages/${packageId}`);
  } catch (error) {
    console.error("Error updating package:", error);
    return json({ errors: { general: "Terjadi kesalahan saat menyimpan data" } }, { status: 500 });
  }
}

export default function EditPackage() {
  const { user, package: pkg } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  const isSubmitting = navigation.state === "submitting";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title={`Edit ${pkg.name}`}
        description="Ubah informasi paket internet"
      >
        <Button variant="outline" asChild>
          <Link to={`/packages/${pkg.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informasi Paket</CardTitle>
          {pkg._count.customers > 0 && (
            <p className="text-sm text-amber-600">
              ⚠️ Paket ini digunakan oleh {pkg._count.customers} pelanggan. Perubahan akan mempengaruhi semua pelanggan.
            </p>
          )}
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
                  defaultValue={pkg.name}
                  placeholder="Contoh: Basic 10 Mbps"
                  className={actionData?.errors?.name ? "border-red-500" : ""}
                />
                {actionData?.errors?.name && (
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
                  defaultValue={pkg.speed}
                  placeholder="Contoh: 10 Mbps, 25 Mbps, Unlimited"
                  className={actionData?.errors?.speed ? "border-red-500" : ""}
                />
                {actionData?.errors?.speed && (
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
                    defaultValue={pkg.price.toString()}
                    placeholder="150000"
                    className={`pl-10 ${actionData?.errors?.price ? "border-red-500" : ""}`}
                  />
                </div>
                {actionData?.errors?.price && (
                  <p className="text-red-500 text-sm">{actionData.errors.price}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Durasi *</Label>
                <Select name="duration" defaultValue={pkg.duration} required>
                  <SelectTrigger className={actionData?.errors?.duration ? "border-red-500" : ""}>
                    <SelectValue placeholder="Pilih durasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Bulanan</SelectItem>
                    <SelectItem value="YEARLY">Tahunan</SelectItem>
                  </SelectContent>
                </Select>
                {actionData?.errors?.duration && (
                  <p className="text-red-500 text-sm">{actionData.errors.duration}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={pkg.description || ""}
                placeholder="Deskripsi paket (opsional)"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="isActive" name="isActive" defaultChecked={pkg.isActive} />
              <Label htmlFor="isActive">Paket aktif dan tersedia untuk pelanggan</Label>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Button type="button" variant="outline" asChild>
                <Link to={`/packages/${pkg.id}`}>Batal</Link>
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
    </PageContainer>
  );
}