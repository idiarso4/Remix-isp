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
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Link } from "@remix-run/react";
import { db } from "~/lib/db.server";
import { TicketPriority, TicketCategory } from "@prisma/client";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "create");

  const [customers, technicians] = await Promise.all([
    db.customer.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, email: true, location: true },
      orderBy: { name: "asc" }
    }),
    db.employee.findMany({
      where: { 
        canHandleTickets: true, 
        isActive: true,
        handlingStatus: { in: ["AVAILABLE", "BUSY"] }
      },
      select: { 
        id: true, 
        name: true, 
        position: true,
        currentTicketCount: true,
        maxConcurrentTickets: true,
        handlingStatus: true
      },
      orderBy: { name: "asc" }
    })
  ]);

  return json({ user, customers, technicians });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "create");

  const formData = await request.formData();
  const title = formData.get("title")?.toString();
  const description = formData.get("description")?.toString();
  const customerId = formData.get("customerId")?.toString();
  const priorityString = formData.get("priority")?.toString();
  const categoryString = formData.get("category")?.toString();
  const assignedToId = formData.get("assignedToId")?.toString() || null;

  // Validation
  const errors: Record<string, string> = {};
  
  if (!title || title.trim().length === 0) {
    errors.title = "Judul tiket wajib diisi";
  }

  if (!description || description.trim().length === 0) {
    errors.description = "Deskripsi masalah wajib diisi";
  }

  if (!customerId) {
    errors.customerId = "Pelanggan wajib dipilih";
  }

  if (!priorityString) {
    errors.priority = "Prioritas wajib dipilih";
  }

  if (!categoryString) {
    errors.category = "Kategori wajib dipilih";
  }

  // Check if assigned technician is available
  if (assignedToId) {
    const technician = await db.employee.findUnique({
      where: { id: assignedToId },
      select: { currentTicketCount: true, maxConcurrentTickets: true, handlingStatus: true }
    });

    if (!technician) {
      errors.assignedToId = "Teknisi tidak ditemukan";
    } else if (technician.handlingStatus === "OFFLINE") {
      errors.assignedToId = "Teknisi sedang offline";
    } else if (technician.currentTicketCount >= technician.maxConcurrentTickets) {
      errors.assignedToId = "Teknisi sudah mencapai batas maksimal tiket";
    }
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    const priority = priorityString as TicketPriority;
    const category = categoryString as TicketCategory;
    
    // Update technician workload if assigned
    if (assignedToId) {
      await db.employee.update({
        where: { id: assignedToId },
        data: {
          currentTicketCount: {
            increment: 1
          }
        }
      });
    }

    const ticket = await db.ticket.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        customerId,
        priority,
        category,
        assignedToId,
      },
    });

    // Create status history entry for assignment
    if (assignedToId) {
      await db.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          fromStatus: null,
          toStatus: "ASSIGNED",
          changedBy: assignedToId,
          reason: "Initial assignment"
        }
      });
    }

    return redirect(`/tickets/${ticket.id}`);
  } catch (error) {
    console.error("Error creating ticket:", error);
    return json({ errors: { general: "Terjadi kesalahan saat menyimpan data" } }, { status: 500 });
  }
}

export default function NewTicket() {
  const { user, customers, technicians } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  const isSubmitting = navigation.state === "submitting";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Buat Tiket Baru"
        description="Buat tiket layanan untuk masalah pelanggan"
      >
        <Link to="/tickets">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            Informasi Tiket
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
              <Label htmlFor="title">Judul Tiket *</Label>
              <Input
                id="title"
                name="title"
                type="text"
                required
                placeholder="Contoh: Internet tidak bisa connect"
                className={actionData?.errors && 'title' in actionData.errors ? "border-red-500" : ""}
              />
              {actionData?.errors && 'title' in actionData.errors && (
                <p className="text-red-500 text-sm">{actionData.errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerId">Pelanggan *</Label>
              <select 
                name="customerId" 
                required
                className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${actionData?.errors && 'customerId' in actionData.errors ? "border-red-500" : ""}`}
              >
                <option value="">Pilih pelanggan</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.email} • {customer.location}
                  </option>
                ))}
              </select>
              {actionData?.errors && 'customerId' in actionData.errors && (
                <p className="text-red-500 text-sm">{actionData.errors.customerId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi Masalah *</Label>
              <Textarea
                id="description"
                name="description"
                required
                placeholder="Jelaskan masalah yang dialami pelanggan secara detail..."
                rows={4}
                className={actionData?.errors && 'description' in actionData.errors ? "border-red-500" : ""}
              />
              {actionData?.errors && 'description' in actionData.errors && (
                <p className="text-red-500 text-sm">{actionData.errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioritas *</Label>
                <select 
                  name="priority" 
                  required
                  className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${actionData?.errors && 'priority' in actionData.errors ? "border-red-500" : ""}`}
                >
                  <option value="">Pilih prioritas</option>
                  <option value="LOW">Rendah</option>
                  <option value="MEDIUM">Sedang</option>
                  <option value="HIGH">Tinggi</option>
                  <option value="URGENT">Mendesak</option>
                </select>
                {actionData?.errors && 'priority' in actionData.errors && (
                  <p className="text-red-500 text-sm">{actionData.errors.priority}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategori *</Label>
                <select 
                  name="category" 
                  required
                  className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${actionData?.errors && 'category' in actionData.errors ? "border-red-500" : ""}`}
                >
                  <option value="">Pilih kategori</option>
                  <option value="NETWORK_ISSUES">Masalah Jaringan</option>
                  <option value="EQUIPMENT_DAMAGE">Kerusakan Perangkat</option>
                  <option value="INSTALLATION">Instalasi</option>
                  <option value="OTHERS">Lainnya</option>
                </select>
                {actionData?.errors && 'category' in actionData.errors && (
                  <p className="text-red-500 text-sm">{actionData.errors.category}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedToId">Tugaskan ke Teknisi (Opsional)</Label>
              <select 
                name="assignedToId"
                className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${actionData?.errors && 'assignedToId' in actionData.errors ? "border-red-500" : ""}`}
              >
                <option value="">Belum ditugaskan</option>
                {technicians.map((tech) => (
                  <option 
                    key={tech.id} 
                    value={tech.id}
                    disabled={tech.currentTicketCount >= tech.maxConcurrentTickets || tech.handlingStatus === "OFFLINE"}
                  >
                    {tech.name} - {tech.position} ({tech.currentTicketCount}/{tech.maxConcurrentTickets} tiket) - {tech.handlingStatus}
                  </option>
                ))}
              </select>
              {actionData?.errors && 'assignedToId' in actionData.errors && (
                <p className="text-red-500 text-sm">{actionData.errors.assignedToId}</p>
              )}
              <p className="text-sm text-gray-500">
                Jika tidak ditugaskan sekarang, tiket akan masuk ke antrian untuk ditugaskan nanti.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Link to="/tickets">
                <Button type="button" variant="outline">Batal</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Membuat...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Buat Tiket
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