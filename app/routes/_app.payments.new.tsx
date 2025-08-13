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

const createPaymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  status: z.enum(['PAID', 'PENDING', 'OVERDUE']).default('PENDING')
});

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "create");

  const customers = await db.customer.findMany({
    where: { status: 'ACTIVE' },
    select: { 
      id: true, 
      name: true,
      package: {
        select: {
          name: true,
          price: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return json({ user, customers });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "create");

  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    
    const validation = createPaymentSchema.safeParse(data);
    if (!validation.success) {
      return json({ 
        error: "Invalid data", 
        errors: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { customerId, amount, paymentDate, status } = validation.data;

    // Verify customer exists
    const customer = await db.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return json({ error: "Customer not found" }, { status: 404 });
    }

    await db.payment.create({
      data: {
        customerId,
        amount,
        paymentDate: new Date(paymentDate),
        status
      }
    });

    return redirect("/payments");

  } catch (error) {
    console.error("Error creating payment:", error);
    return json({ error: "Failed to create payment" }, { status: 500 });
  }
}

export default function NewPayment() {
  const { customers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Add New Payment"
        description="Record a new customer payment"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customerId">Customer *</Label>
                  <Select name="customerId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            {customer.package && (
                              <div className="text-sm text-gray-500">
                                {customer.package.name} - Rp {customer.package.price.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {actionData?.errors?.customerId && (
                    <p className="text-sm text-red-600">{actionData.errors.customerId[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (IDR) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
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
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                  />
                  {actionData?.errors?.paymentDate && (
                    <p className="text-sm text-red-600">{actionData.errors.paymentDate[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Payment Status</Label>
                  <Select name="status" defaultValue="PENDING">
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Payment
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