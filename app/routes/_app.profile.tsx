import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import bcrypt from "bcryptjs";

export const meta: MetaFunction = () => {
  return [
    { title: "Profil - ISP Management System" },
    { name: "description", content: "Kelola profil pengguna Anda" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  
  // Get complete employee data
  const employee = await db.employee.findUnique({
    where: { id: user.employee!.id },
    include: {
      user: {
        select: {
          email: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (!employee) {
    throw new Response("Employee not found", { status: 404 });
  }

  return json({ user, employee });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "update-profile") {
      const name = formData.get("name") as string;
      const phone = formData.get("phone") as string;

      if (!name?.trim()) {
        return json({ error: "Nama harus diisi" }, { status: 400 });
      }

      await db.employee.update({
        where: { id: user.employee!.id },
        data: {
          name: name.trim(),
          phone: phone?.trim() || null,
        }
      });

      return json({ success: "Profil berhasil diperbarui" });
    }

    if (intent === "change-password") {
      const currentPassword = formData.get("currentPassword") as string;
      const newPassword = formData.get("newPassword") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return json({ error: "Semua field password harus diisi" }, { status: 400 });
      }

      if (newPassword !== confirmPassword) {
        return json({ error: "Password baru dan konfirmasi tidak cocok" }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
      }

      // Get current user data
      const userData = await db.user.findUnique({
        where: { id: user.id }
      });

      if (!userData?.passwordHash) {
        return json({ error: "Data pengguna tidak valid" }, { status: 400 });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, userData.passwordHash);
      if (!isValidPassword) {
        return json({ error: "Password saat ini salah" }, { status: 400 });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash
        }
      });

      return json({ success: "Password berhasil diubah" });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Profile update error:", error);
    return json({ error: "Terjadi kesalahan saat memperbarui profil" }, { status: 500 });
  }
}

const roleColors = {
  ADMIN: "bg-red-100 text-red-700 border-red-300",
  TECHNICIAN: "bg-blue-100 text-blue-700 border-blue-300",
  MARKETING: "bg-green-100 text-green-700 border-green-300",
  HR: "bg-purple-100 text-purple-700 border-purple-300",
};

const roleLabels = {
  ADMIN: "Administrator",
  TECHNICIAN: "Teknisi",
  MARKETING: "Marketing",
  HR: "Human Resources",
};

export default function Profile() {
  const { user, employee } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Profil Pengguna"
        description="Kelola informasi profil dan pengaturan akun Anda"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24 border-4 border-gray-200">
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-2xl font-bold">
                    {getUserInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">{employee.name}</CardTitle>
              <p className="text-gray-600">{employee.user.email}</p>
              <div className="flex justify-center mt-3">
                <Badge className={`${roleColors[employee.role as keyof typeof roleColors] || roleColors.TECHNICIAN}`}>
                  {roleLabels[employee.role as keyof typeof roleLabels] || "User"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <Briefcase className="h-4 w-4 mr-2" />
                <span>{employee.position || "Tidak ada posisi"}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="h-4 w-4 mr-2" />
                <span>{employee.division || "Tidak ada divisi"}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Bergabung {format(new Date(employee.user?.createdAt || employee.createdAt), "dd MMMM yyyy", { locale: id })}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>{employee.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* Success/Error Messages */}
          {actionData && 'success' in actionData && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {actionData.success}
              </AlertDescription>
            </Alert>
          )}

          {actionData && 'error' in actionData && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {actionData.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Update Profile Form */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Edit className="mr-2 h-5 w-5" />
                Edit Profil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-6">
                <input type="hidden" name="intent" value="update-profile" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        name="name"
                        defaultValue={employee.name}
                        placeholder="Masukkan nama lengkap"
                        className="pl-10"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        value={employee.user?.email || user.email}
                        className="pl-10 bg-gray-50"
                        disabled
                      />
                    </div>
                    <p className="text-xs text-gray-500">Email tidak dapat diubah</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        defaultValue={employee.phone || ""}
                        placeholder="Masukkan nomor telepon"
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="role"
                        value={roleLabels[employee.role as keyof typeof roleLabels] || "User"}
                        className="pl-10 bg-gray-50"
                        disabled
                      />
                    </div>
                    <p className="text-xs text-gray-500">Role tidak dapat diubah</p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Menyimpan...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="mr-2 h-4 w-4" />
                      Simpan Perubahan
                    </div>
                  )}
                </Button>
              </Form>
            </CardContent>
          </Card>

          {/* Change Password Form */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Ubah Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-6">
                <input type="hidden" name="intent" value="change-password" />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Password Saat Ini</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      placeholder="Masukkan password saat ini"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      placeholder="Masukkan password baru"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Konfirmasi password baru"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  className="w-full md:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Mengubah...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Shield className="mr-2 h-4 w-4" />
                      Ubah Password
                    </div>
                  )}
                </Button>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}