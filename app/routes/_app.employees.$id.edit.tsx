import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, Save, User } from "lucide-react";
import { Link } from "@remix-run/react";
import { db } from "~/lib/db.server";
import { Role, HandlingStatus } from "@prisma/client";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "employees", "update");

  const employeeId = params.id;
  if (!employeeId) {
    throw new Response("Employee ID is required", { status: 400 });
  }

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: {
        select: { email: true }
      },
      assignedTickets: {
        where: {
          status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] }
        },
        select: { id: true }
      }
    }
  });

  if (!employee) {
    throw new Response("Employee not found", { status: 404 });
  }

  return json({ user, employee });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "employees", "update");

  const employeeId = params.id;
  if (!employeeId) {
    throw new Response("Employee ID is required", { status: 400 });
  }

  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const phone = formData.get("phone")?.toString() || null;
  const position = formData.get("position")?.toString() || null;
  const division = formData.get("division")?.toString() || null;
  const roleString = formData.get("role")?.toString();
  const hireDateString = formData.get("hireDate")?.toString();
  const photoUrl = formData.get("photoUrl")?.toString() || null;
  const isActiveString = formData.get("isActive")?.toString();
  const canHandleTicketsString = formData.get("canHandleTickets")?.toString();
  const handlingStatusString = formData.get("handlingStatus")?.toString();
  const maxConcurrentTicketsString = formData.get("maxConcurrentTickets")?.toString();

  // Validation
  const errors: Record<string, string> = {};

  if (!name || name.trim().length === 0) {
    errors.name = "Nama karyawan wajib diisi";
  }

  if (!roleString) {
    errors.role = "Role wajib dipilih";
  }

  if (!hireDateString) {
    errors.hireDate = "Tanggal bergabung wajib diisi";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    const role = roleString as Role;
    const hireDate = new Date(hireDateString!);
    const isActive = isActiveString === "on";
    const canHandleTickets = canHandleTicketsString === "on";
    const handlingStatus = handlingStatusString as HandlingStatus;
    const maxConcurrentTickets = maxConcurrentTicketsString ? parseInt(maxConcurrentTicketsString) : 5;

    await db.employee.update({
      where: { id: employeeId },
      data: {
        name: name!.trim(),
        phone: phone?.trim() || null,
        position: position?.trim() || null,
        division: division?.trim() || null,
        role,
        hireDate,
        photoUrl: photoUrl?.trim() || null,
        isActive,
        canHandleTickets,
        handlingStatus: canHandleTickets ? handlingStatus : HandlingStatus.OFFLINE,
        maxConcurrentTickets,
      },
    });

    return redirect(`/employees/${employeeId}`);
  } catch (error) {
    console.error("Error updating employee:", error);
    return json({ errors: { general: "Terjadi kesalahan saat menyimpan data" } }, { status: 500 });
  }
}

export default function EditEmployee() {
  const { user, employee } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as { errors?: Record<string, string> } | undefined;
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title={`Edit ${employee.name}`}
        description="Ubah informasi karyawan"
      >
        <Button variant="outline" asChild>
          <Link to={`/employees/${employee.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Informasi Karyawan
          </CardTitle>
          {employee.assignedTickets.length > 0 && (
            <p className="text-sm text-amber-600">
              ⚠️ Karyawan ini sedang menangani {employee.assignedTickets.length} tiket aktif. Perubahan status dapat mempengaruhi penanganan tiket.
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
                <Label htmlFor="name">Nama Lengkap *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  defaultValue={employee.name}
                  placeholder="Masukkan nama lengkap"
                  className={actionData?.errors?.name ? "border-red-500" : ""}
                />
                {actionData?.errors?.name && (
                  <p className="text-red-500 text-sm">{actionData.errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={employee.user?.email || ""}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-sm text-gray-500">Email tidak dapat diubah</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={employee.phone || ""}
                  placeholder="+62 812 3456 7890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Posisi</Label>
                <Input
                  id="position"
                  name="position"
                  type="text"
                  defaultValue={employee.position || ""}
                  placeholder="Contoh: Senior Technician"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">Divisi</Label>
                <Input
                  id="division"
                  name="division"
                  type="text"
                  defaultValue={employee.division || ""}
                  placeholder="Contoh: Technical Support"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select name="role" defaultValue={employee.role} required>
                  <SelectTrigger className={actionData?.errors?.role ? "border-red-500" : ""}>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="TECHNICIAN">Teknisi</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                  </SelectContent>
                </Select>
                {actionData?.errors?.role && (
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
                  defaultValue={new Date(employee.hireDate).toISOString().split('T')[0]}
                  className={actionData?.errors?.hireDate ? "border-red-500" : ""}
                />
                {actionData?.errors?.hireDate && (
                  <p className="text-red-500 text-sm">{actionData.errors.hireDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="photoUrl">URL Foto Profil</Label>
                <Input
                  id="photoUrl"
                  name="photoUrl"
                  type="url"
                  defaultValue={employee.photoUrl || ""}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">Status Karyawan</h3>

              <div className="flex items-center space-x-2">
                <Checkbox id="isActive" name="isActive" defaultChecked={employee.isActive} />
                <Label htmlFor="isActive">Karyawan aktif</Label>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">Pengaturan Penanganan Tiket</h3>

              <div className="flex items-center space-x-2">
                <Checkbox id="canHandleTickets" name="canHandleTickets" defaultChecked={employee.canHandleTickets} />
                <Label htmlFor="canHandleTickets">Dapat menangani tiket layanan</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="handlingStatus">Status Penanganan</Label>
                  <Select name="handlingStatus" defaultValue={employee.handlingStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="BUSY">Busy</SelectItem>
                      <SelectItem value="OFFLINE">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxConcurrentTickets">Maksimal Tiket Bersamaan</Label>
                  <Input
                    id="maxConcurrentTickets"
                    name="maxConcurrentTickets"
                    type="number"
                    min="1"
                    max="20"
                    defaultValue={employee.maxConcurrentTickets}
                    placeholder="5"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500">
                Saat ini menangani {employee.currentTicketCount} dari {employee.maxConcurrentTickets} tiket maksimal
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Button type="button" variant="outline" asChild>
                <Link to={`/employees/${employee.id}`}>Batal</Link>
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