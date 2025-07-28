import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { PermissionGate } from "~/components/permission-gate";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, Edit, User, Phone, Mail, Calendar, Briefcase, Award, Clock, Star, Printer } from "lucide-react";
import { db } from "~/lib/db.server";
// import { format } from "date-fns";
// import { id } from "date-fns/locale";

export async function loader({ request, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    requirePermission(user, "employees", "read");

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
                include: {
                    customer: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: 10
            },
            ticketNotes: {
                include: {
                    ticket: {
                        select: { title: true, customer: { select: { name: true } } }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: 5
            },
            performanceMetrics: true
        }
    });

    if (!employee) {
        throw new Response("Employee not found", { status: 404 });
    }

    // Get completed tickets count for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCompletedTickets = await db.ticket.count({
        where: {
            assignedToId: employeeId,
            status: "RESOLVED",
            completedAt: {
                gte: thirtyDaysAgo
            }
        }
    });

    return json({ user, employee, recentCompletedTickets });
}

export default function EmployeeDetail() {
    const { user, employee, recentCompletedTickets } = useLoaderData<typeof loader>();

    const getRoleVariant = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'destructive';
            case 'TECHNICIAN': return 'default';
            case 'MARKETING': return 'secondary';
            case 'HR': return 'outline';
            default: return 'outline';
        }
    };

    const getHandlingStatusVariant = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'default';
            case 'BUSY': return 'secondary';
            case 'OFFLINE': return 'destructive';
            default: return 'outline';
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <PageContainer className="py-8">
            <PageHeader
                title={employee.name}
                description="Detail informasi karyawan"
            >
                <div className="flex items-center space-x-3">
                    <Button variant="outline" onClick={handlePrint} className="print:hidden">
                        <Printer className="mr-2 h-4 w-4" />
                        Cetak
                    </Button>

                    <Button variant="outline" asChild>
                        <Link to="/employees">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Kembali
                        </Link>
                    </Button>

                    <PermissionGate user={user} resource="employees" action="update">
                        <Button asChild>
                            <Link to={`/employees/${employee.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </Button>
                    </PermissionGate>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Employee Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <User className="mr-2 h-5 w-5" />
                                Informasi Pribadi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                                    {employee.photoUrl ? (
                                        <img src={employee.photoUrl} alt={employee.name} className="h-20 w-20 rounded-full object-cover" />
                                    ) : (
                                        <User className="h-10 w-10 text-gray-500" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">{employee.name}</h2>
                                    <p className="text-gray-600">{employee.position || 'Tidak ada posisi'}</p>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Badge variant={getRoleVariant(employee.role)}>
                                            {employee.role}
                                        </Badge>
                                        <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                                            {employee.isActive ? 'Aktif' : 'Tidak Aktif'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Email</label>
                                    <p className="flex items-center">
                                        <Mail className="mr-2 h-4 w-4 text-gray-400" />
                                        {employee.user?.email || 'Tidak ada email'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Telepon</label>
                                    <p className="flex items-center">
                                        <Phone className="mr-2 h-4 w-4 text-gray-400" />
                                        {employee.phone || 'Tidak ada telepon'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Divisi</label>
                                    <p className="flex items-center">
                                        <Briefcase className="mr-2 h-4 w-4 text-gray-400" />
                                        {employee.division || 'Tidak ada divisi'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Tanggal Bergabung</label>
                                    <p className="flex items-center">
                                        <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                                        {new Date(employee.hireDate).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ticket Handling */}
                    {employee.canHandleTickets && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Penanganan Tiket</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Status Penanganan</label>
                                        <div className="mt-1">
                                            <Badge variant={getHandlingStatusVariant(employee.handlingStatus)}>
                                                {employee.handlingStatus}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Tiket Aktif</label>
                                        <p className="text-lg font-semibold">
                                            {employee.currentTicketCount} / {employee.maxConcurrentTickets}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Selesai (30 hari)</label>
                                        <p className="text-lg font-semibold text-green-600">{recentCompletedTickets}</p>
                                    </div>
                                </div>

                                {employee.assignedTickets.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-3">Tiket yang Sedang Ditangani:</h4>
                                        <div className="space-y-2">
                                            {employee.assignedTickets.map((ticket) => (
                                                <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{ticket.title}</p>
                                                        <p className="text-sm text-gray-500">
                                                            {ticket.customer.name} • {new Date(ticket.createdAt).toLocaleDateString('id-ID')}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'URGENT' ? 'destructive' : 'outline'}>
                                                            {ticket.priority}
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                            {ticket.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Recent Notes */}
                    {employee.ticketNotes.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Catatan Terbaru</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {employee.ticketNotes.map((note) => (
                                        <div key={note.id} className="border-l-4 border-blue-200 pl-4 py-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-sm">
                                                    {note.ticket.title} - {note.ticket.customer.name}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(note.createdAt).toLocaleDateString('id-ID')} {new Date(note.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 text-sm">{note.note}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Performance Metrics */}
                    {employee.performanceMetrics && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Award className="mr-2 h-5 w-5" />
                                    Performa
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Total Tiket Selesai</label>
                                    <p className="text-2xl font-bold text-green-600">
                                        {employee.performanceMetrics.totalTicketsResolved}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-500">Rata-rata Waktu Penyelesaian</label>
                                    <p className="flex items-center text-lg font-semibold">
                                        <Clock className="mr-2 h-4 w-4 text-gray-400" />
                                        {Number(employee.performanceMetrics.averageResolutionTime).toFixed(1)} jam
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-500">Rating Pelanggan</label>
                                    <p className="flex items-center text-lg font-semibold">
                                        <Star className="mr-2 h-4 w-4 text-yellow-500" />
                                        {Number(employee.performanceMetrics.customerRating).toFixed(1)}/5
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-500">Tiket Bulan Ini</label>
                                    <p className="text-lg font-semibold">
                                        {employee.performanceMetrics.ticketsResolvedThisMonth}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Account Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Calendar className="mr-2 h-5 w-5" />
                                Informasi Akun
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-gray-500">Dibuat</label>
                                <p>{new Date(employee.createdAt).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Terakhir Diupdate</label>
                                <p>{new Date(employee.updatedAt).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                            </div>
                            {employee.performanceMetrics && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Performa Terakhir Update</label>
                                    <p>{new Date(employee.performanceMetrics.lastUpdated).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .bg-white {
            background-color: white !important;
          }
          .border {
            border: 1px solid #e5e7eb !important;
          }
          .shadow-sm {
            box-shadow: none !important;
          }
        }
      `}</style>
        </PageContainer>
    );
}