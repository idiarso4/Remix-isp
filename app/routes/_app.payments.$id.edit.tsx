import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation, Link } from "@remix-run/react";
import { z } from "zod";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, Save, CreditCard } from "lucide-react";
import { db } from "~/lib/db.server";
import { format } from "date-fns";

const updatePaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  status: z.enum(['PAID', 'PENDING', 'OVERDUE'])
});

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "update");

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
          package: {
            select: {
              name: true,
              price: true
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

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "update");

  const paymentId = params.id;
  if (!paymentId) {
    throw new Response("Payment ID is required", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    
    const validation = updatePaymentSchema.safeParse(data);
    if (!validation.success) {
      return json({ 
        error: "Invalid data", 
        errors: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { amount, paymentDate, status } = validation.data;

    await db.payment.update({
      where: { id: paymentId },
      data: {
        amount,
        paymentDate: new Date(paymentDate),
        status
      }
    });

    return redirect("/payments");

  } catch (error) {
    console.error("Error updating payment:", error);
    return json({ error: "Failed to update payment" }, { status: 500 });
  }
}

export default function EditPayment() {
  const { payment } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Edit Payment"
        description={`Update payment for ${payment.customer.name}`}
      >
        <Button variant="outline" asChild>
          <Link to="/payments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payments
          </Link>
        </Button>
      </PageHeader>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              {actionData?.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="text-sm text-red-600">{actionData.error}</div>
                </div>
              )}

              {/* Customer Info (Read-only) */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{payment.customer.name}</h3>
                    {payment.customer.package && (
                      <p className="text-sm text-gray-500">
                        {payment.customer.package.name} - Rp {payment.customer.package.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Customer cannot be changed
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (IDR) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={Number(payment.amount)}
                    placeholder="Enter payment amount"
                    required
                  />
                  {actionData?.errors?.amount && (
                    <p className="text-sm text-red-600">{actionData.errors.amount[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    name="paymentDate"
                    type="date"
                    defaultValue={format(new Date(payment.paymentDate), 'yyyy-MM-dd')}
                    required
                  />
                  {actionData?.errors?.paymentDate && (
                    <p className="text-sm text-red-600">{actionData.errors.paymentDate[0]}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="status">Payment Status</Label>
                  <Select name="status" defaultValue={payment.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="OVERDUE">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  {actionData?.errors?.status && (
                    <p className="text-sm text-red-600">{actionData.errors.status[0]}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6">
                <Button type="button" variant="outline" asChild>
                  <Link to="/payments">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Payment
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}