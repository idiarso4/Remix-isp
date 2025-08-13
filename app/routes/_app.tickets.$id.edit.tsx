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
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, Save, AlertCircle, User } from "lucide-react";
import { Link } from "@remix-run/react";
import { db } from "~/lib/db.server";
import { TicketStatus, TicketPriority, TicketCategory } from "@prisma/client";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "update");

  const ticketId = params.id;
  if (!ticketId) {
    throw new Response("Ticket ID is required", { status: 400 });
  }

  const [ticket, technicians] = await Promise.all([
    db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, location: true }
        },
        assignedTo: {
          select: { id: true, name: true, position: true }
        }
      }
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

  if (!ticket) {
    throw new Response("Ticket not found", { status: 404 });
  }

  return json({ user, ticket, technicians });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "tickets", "update");

  const ticketId = params.id;
  if (!ticketId) {
    throw new Response("Ticket ID is required", { status: 400 });
  }

  const formData = await request.formData();
  const title = formData.get("title")?.toString();
  const description = formData.get("description")?.toString();
  const statusString = formData.get("status")?.toString();
  const priorityString = formData.get("priority")?.toString();
  const categoryString = formData.get("category")?.toString();
  const assignedToId = formData.get("assignedToId")?.toString() || null;
  const note = formData.get("note")?.toString();

  // Validation
  const errors: Record<string, string> = {};
  
  if (!title || title.trim().length === 0) {
    errors.title = "Judul tiket wajib diisi";
  }

  if (!description || description.trim().length === 0) {
    errors.description = "Deskripsi masalah wajib diisi";
  }

  if (!statusString) {
    errors.status = "Status wajib dipilih";
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
    }
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    const status = statusString as TicketStatus;
    const priority = priorityString as TicketPriority;
    const category = categoryString as TicketCategory;

    // Get current ticket to check for changes
    const currentTicket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { status: true, assignedToId: true }
    });

    if (!currentTicket) {
      return json({ errors: { general: "Tiket tidak ditemukan" } }, { status: 404 });
    }

    // Handle assignment changes
    if (currentTicket.assignedToId !== assignedToId) {
      // Decrease count for previous technician
      if (currentTicket.assignedToId) {
        await db.employee.update({
          where: { id: currentTicket.assignedToId },
          data: {
            currentTicketCount: {
              decrement: 1
            }
          }
        });
      }
      
      // Increase count for new technician
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
    }

    // Handle status changes
    const updateData: any = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      category,
      assignedToId,
    };

    // Set completion date if resolving
    if (status === TicketStatus.RESOLVED && currentTicket.status !== TicketStatus.RESOLVED) {
      updateData.completedAt = new Date();
      
      // Decrease technician workload when resolving
      if (assignedToId) {
        await db.employee.update({
          where: { id: assignedToId },
          data: {
            currentTicketCount: {
              decrement: 1
            }
          }
        });
      }
    }

    // If reopening a resolved ticket, clear completion date and increase workload
    if (currentTicket.status === TicketStatus.RESOLVED && status !== TicketStatus.RESOLVED && status !== TicketStatus.CLOSED) {
      updateData.completedAt = null;
      
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
    }

    await db.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Create status history entry if status changed
    if (currentTicket.status !== status && assignedToId) {
      await db.ticketStatusHistory.create({
        data: {
          ticketId,
          fromStatus: currentTicket.status,
          toStatus: status,
          changedBy: assignedToId,
          reason: "Status updated via edit form"
        }
      });
    }

    // Add note if provided
    if (note && note.trim().length > 0 && assignedToId) {
      await db.ticketNote.create({
        data: {
          ticketId,
          employeeId: assignedToId,
          note: note.trim()
        }
      });
    }

    return redirect(`/tickets/${ticketId}`);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return json({ errors: { general: "Terjadi kesalahan saat menyimpan data" } }, { status: 500 });
  }
}

export default function EditTicket() {
  const { user, ticket, technicians } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ errors?: Record<string, string>; success?: string; error?: string }>();
  const navigation = useNavigation();
  
  const isSubmitting = navigation.state === "submitting";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title={`Edit ${ticket.title}`}
        description={`Tiket #${ticket.id.slice(-8).toUpperCase()}`}
      >
        <Button variant="outline" asChild>
          <Link to={`/tickets/${ticket.id}`}>
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
                <AlertCircle className="mr-2 h-5 w-5" />
                Edit Tiket
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
                    defaultValue={ticket.title}
                    className={actionData?.errors?.title ? "border-red-500" : ""}
                  />
                  {actionData?.errors?.title && (
                    <p className="text-red-500 text-sm">{actionData.errors.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi Masalah *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    required
                    defaultValue={ticket.description}
                    rows={4}
                    className={actionData?.errors?.description ? "border-red-500" : ""}
                  />
                  {actionData?.errors?.description && (
                    <p className="text-red-500 text-sm">{actionData.errors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select name="status" defaultValue={ticket.status} required>
                      <SelectTrigger className={actionData?.errors?.status ? "border-red-500" : ""}>
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Terbuka</SelectItem>
                        <SelectItem value="IN_PROGRESS">Dalam Proses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="RESOLVED">Selesai</SelectItem>
                        <SelectItem value="CLOSED">Ditutup</SelectItem>
                      </SelectContent>
                    </Select>
                    {actionData?.errors?.status && (
                      <p className="text-red-500 text-sm">{actionData.errors.status}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioritas *</Label>
                    <Select name="priority" defaultValue={ticket.priority} required>
                      <SelectTrigger className={actionData?.errors?.priority ? "border-red-500" : ""}>
                        <SelectValue placeholder="Pilih prioritas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Rendah</SelectItem>
                        <SelectItem value="MEDIUM">Sedang</SelectItem>
                        <SelectItem value="HIGH">Tinggi</SelectItem>
                        <SelectItem value="URGENT">Mendesak</SelectItem>
                      </SelectContent>
                    </Select>
                    {actionData?.errors?.priority && (
                      <p className="text-red-500 text-sm">{actionData.errors.priority}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Kategori *</Label>
                  <Select name="category" defaultValue={ticket.category} required>
                    <SelectTrigger className={actionData?.errors?.category ? "border-red-500" : ""}>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NETWORK_ISSUES">Masalah Jaringan</SelectItem>
                      <SelectItem value="EQUIPMENT_DAMAGE">Kerusakan Perangkat</SelectItem>
                      <SelectItem value="INSTALLATION">Instalasi</SelectItem>
                      <SelectItem value="OTHERS">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                  {actionData?.errors?.category && (
                    <p className="text-red-500 text-sm">{actionData.errors.category}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignedToId">Teknisi yang Ditugaskan</Label>
                  <Select name="assignedToId" defaultValue={ticket.assignedToId || ""}>
                    <SelectTrigger className={actionData?.errors?.assignedToId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Pilih teknisi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Belum ditugaskan</SelectItem>
                      {technicians.map((tech) => (
                        <SelectItem 
                          key={tech.id} 
                          value={tech.id}
                          disabled={tech.currentTicketCount >= tech.maxConcurrentTickets && tech.id !== ticket.assignedToId}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <div className="font-medium">{tech.name}</div>
                              <div className="text-sm text-gray-500">{tech.position}</div>
                            </div>
                            <div className="text-xs">
                              {tech.currentTicketCount}/{tech.maxConcurrentTickets} tiket
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                tech.handlingStatus === "AVAILABLE" ? "bg-green-100 text-green-800" :
                                tech.handlingStatus === "BUSY" ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              }`}>
                                {tech.handlingStatus}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {actionData?.errors?.assignedToId && (
                    <p className="text-red-500 text-sm">{actionData.errors.assignedToId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Tambah Catatan (Opsional)</Label>
                  <Textarea
                    id="note"
                    name="note"
                    placeholder="Tambahkan catatan penanganan atau update status..."
                    rows={3}
                  />
                  <p className="text-sm text-gray-500">
                    Catatan akan ditambahkan ke riwayat penanganan tiket.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <Button type="button" variant="outline" asChild>
                    <Link to={`/tickets/${ticket.id}`}>Batal</Link>
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

        {/* Sidebar - Customer Info */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Informasi Pelanggan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-lg">{ticket.customer.name}</p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <Link to={`/customers/${ticket.customer.id}`}>
                    Lihat Detail Pelanggan
                  </Link>
                </Button>
              </div>
              
              {ticket.customer.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p>{ticket.customer.email}</p>
                </div>
              )}
              
              {ticket.customer.location && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Lokasi</label>
                  <p>{ticket.customer.location}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}