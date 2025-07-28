import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { Checkbox } from "~/components/ui/checkbox";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, Save, User } from "lucide-react";
import { Link } from "@remix-run/react";
import { db } from "~/lib/db.server";
import { Role, HandlingStatus } from "@prisma/client";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "employees", "create");

  return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "employees", "create");

  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const email = formData.get("email")?.toString();
  const phone = formData.get("phone")?.toString() || null;
  const position = formData.get("position")?.toString() || null;
  const division = formData.get("division")?.toString() || null;
  const roleString = formData.get("role")?.toString();
  const hireDateString = formData.get("hireDate")?.toString();
  const photoUrl = formData.get("photoUrl")?.toString() || null;
  const canHandleTicketsString = formData.get("canHandleTickets")?.toString();
  const maxConcurrentTicketsString = formData.get("maxConcurrentTickets")?.toString();

  // Validation
  const errors: Record<string, string> = {};
  
  if (!name || name.trim().length === 0) {
    errors.name = "Nama karyawan wajib diisi";
  }

  if (!email || email.trim().length === 0) {
    errors.email = "Email wajib diisi";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Format email tidak valid";
  }

  if (!roleString) {
    errors.role = "Role wajib dipilih";
  }

  if (!hireDateString) {
    errors.hireDate = "Tanggal bergabung wajib diisi";
  }

  // Check if email already exists
  if (email) {
    const existingUser = await db.user.findUnique({
      where: { email: email.trim() }
    });
    if (existingUser) {
      errors.email = "Email sudah digunakan";
    }
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    const role = roleString as Role;
    const hireDate = new Date(hireDateString!);
    const canHandleTickets = canHandleTicketsString === "on";
    const maxConcurrentTickets = maxConcurrentTicketsString ? parseInt(maxConcurrentTicketsString) : 5;

    // Create user account first
    const userAccount = await db.user.create({
      data: {
        email: email!.trim(),
        // Password will be set separately or via invitation
      }
    });

    const employee = await db.employee.create({
      data: {
        userId: userAccount.id,
        name: name!.trim(),
        phone: phone?.trim() || null,
        position: position?.trim() || null,
        division: division?.trim() || null,
        role,
        hireDate,
        photoUrl: photoUrl?.trim() || null,
        canHandleTickets,
        maxConcurrentTickets,
        handlingStatus: canHandleTickets ? HandlingStatus.AVAILABLE : HandlingStatus.OFFLINE,
      },
    });

    // Create performance metrics record
    await db.employeePerformance.create({
      data: {
        employeeId: employee.id,
      }
    });

    return redirect(`/employees/${employee.id}`);
  } catch (error) {
    console.error("Error creating employee:", error);
    return json({ errors: { general: "Terjadi kesalahan saat menyimpan data" } }, { status: 500 });
  }
}

export default function NewEmployee() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as { errors?: Record<string, string> } | undefined;
  const navigation = useNavigation();
  
  const isSubmitting = navigation.state === "submitting";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Tambah Karyawan Baru"
        description="Tambahkan karyawan baru ke sistem"
      >
        <Link to="/employees">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Informasi Karyawan
          </CardTitle>
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
                <Label htmlFor="name">Nama Lengkap *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Masukkan nama lengkap"
                  className={actionData?.errors && 'name' in actionData.errors ? "border-red-500" : ""}
                />
                {actionData?.errors && 'name' in actionData.errors && (
                  <p className="text-red-500 text-sm">{actionData.errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
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
                  placeholder="+62 812 3456 7890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Posisi</Label>
                <Input
                  id="position"
                  name="position"
                  type="text"
                  placeholder="Contoh: Senior Technician"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">Divisi</Label>
                <Input
                  id="division"
                  name="division"
                  type="text"
                  placeholder="Contoh: Technical Support"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <select 
                  name="role" 
                  required
                  className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${actionData?.errors && 'role' in actionData.errors ? "border-red-500" : ""}`}
                >
                  <option value="">Pilih role</option>
                  <option value="ADMIN">Admin</option>
                  <option value="TECHNICIAN">Teknisi</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="HR">HR</option>
                </select>
                {actionData?.errors && 'role' in actionData.errors && (
                  <p className="text-red-500 text-sm">{actionData.errors.role}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="hireDate">Tanggal Bergabung *</Label>
                <Input
                  id="hireDate"
                  name="hireDate"
                  type="date"
                  required
                  className={actionData?.errors && 'hireDate' in actionData.errors ? "border-red-500" : ""}
                />
                {actionData?.errors && 'hireDate' in actionData.errors && (
                  <p className="text-red-500 text-sm">{actionData.errors.hireDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="photoUrl">URL Foto Profil</Label>
                <Input
                  id="photoUrl"
                  name="photoUrl"
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">Pengaturan Penanganan Tiket</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="canHandleTickets" name="canHandleTickets" />
                <Label htmlFor="canHandleTickets">Dapat menangani tiket layanan</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxConcurrentTickets">Maksimal Tiket Bersamaan</Label>
                <Input
                  id="maxConcurrentTickets"
                  name="maxConcurrentTickets"
                  type="number"
                  min="1"
                  max="20"
                  defaultValue="5"
                  placeholder="5"
                />
                <p className="text-sm text-gray-500">
                  Jumlah maksimal tiket yang dapat ditangani secara bersamaan
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Link to="/employees">
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