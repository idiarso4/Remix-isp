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
import { ArrowLeft, Edit, CreditCard, User, Calendar, DollarSign, CheckCircle, Clock, AlertTriangle, Printer } from "lucide-react";
import { db } from "~/lib/db.server";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "read");

  const paymentId = params.id;
  if (!paymentId) {
    throw new Response("Payment ID is required", { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          package: {
            select: {
              name: true,
              price: true,
              speed: true,
              duration: true
            }
          }
        }
      }
    }
  });

  if (!payment) {
    throw new Response("Payment not found", { status: 404 });
  }

  return json({ user, payment });
}

export default function PaymentDetail() {
  const { user, payment } = useLoaderData<typeof loader>();

  // Status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PAID': return 'default';
      case 'PENDING': return 'secondary';
      case 'OVERDUE': return 'destructive';
      default: return 'outline';
    }
  };

  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return <CheckCircle className="h-5 w-5" />;
      case 'PENDING': return <Clock className="h-5 w-5" />;
      case 'OVERDUE': return <AlertTriangle className="h-5 w-5" />;
      default: return <CreditCard className="h-5 w-5" />;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Payment Details"
        description={`Payment information for ${payment.customer.name}`}
      >
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>

          <Button variant="outline" asChild>
            <Link to="/payments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payments
            </Link>
          </Button>

          <PermissionGate user={user} resource="customers" action="update">
            <Button asChild>
              <Link to={`/payments/${payment.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Payment
              </Link>
            </Button>
          </PermissionGate>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment ID</label>
                  <p className="text-lg font-mono">{payment.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(payment.status)} className="flex items-center w-fit">
                      {getStatusIcon(payment.status)}
                      <span className="ml-2">{payment.status}</span>
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(Number(payment.amount))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Date</label>
                  <p className="flex items-center text-lg">
                    <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                    {format(new Date(payment.paymentDate), "dd MMMM yyyy", { locale: id })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer Name</label>
                  <p className="text-lg font-semibold">{payment.customer.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p>{payment.customer.email || "No email"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p>{payment.customer.phone || "No phone"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p>{payment.customer.address || "No address"}</p>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline" asChild>
                  <Link to={`/customers/${payment.customer.id}`}>
                    View Customer Details
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Package Information */}
          {payment.customer.package && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Package Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{payment.customer.package.name}</p>
                    <p className="text-sm text-gray-500">{payment.customer.package.speed}</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(Number(payment.customer.package.price))}
                    </p>
                    <p className="text-sm text-gray-500">
                      per {payment.customer.package.duration === 'MONTHLY' ? 'month' : 'year'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Amount:</span>
                <span className="font-semibold">{formatCurrency(Number(payment.amount))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Date:</span>
                <span className="font-semibold">
                  {format(new Date(payment.paymentDate), "dd MMM yyyy", { locale: id })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                <Badge variant={getStatusVariant(payment.status)}>
                  {payment.status}
                </Badge>
              </div>
              <hr className="my-3" />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">{formatCurrency(Number(payment.amount))}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <PermissionGate user={user} resource="customers" action="update">
                <Button className="w-full" asChild>
                  <Link to={`/payments/${payment.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Payment
                  </Link>
                </Button>
              </PermissionGate>

              <Button variant="outline" className="w-full" asChild>
                <Link to={`/customers/${payment.customer.id}`}>
                  <User className="mr-2 h-4 w-4" />
                  View Customer
                </Link>
              </Button>

              <Button variant="outline" className="w-full" asChild>
                <Link to="/payments">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  All Payments
                </Link>
              </Button>
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