import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

const createPaymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  status: z.enum(['PAID', 'PENDING', 'OVERDUE']).default('PENDING')
});

const updatePaymentSchema = z.object({
  id: z.string().min(1, "Payment ID is required"),
  amount: z.coerce.number().positive("Amount must be positive").optional(),
  paymentDate: z.string().optional(),
  status: z.enum(['PAID', 'PENDING', 'OVERDUE']).optional()
});

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "read");

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");
  const customerId = url.searchParams.get("customer");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const where: any = {};
  
  if (search) {
    where.customer = {
      name: { contains: search, mode: "insensitive" }
    };
  }
  
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }
  
  if (customerId) {
    where.customerId = customerId;
  }
  
  if (dateFrom) {
    where.paymentDate = { gte: new Date(dateFrom) };
  }
  
  if (dateTo) {
    where.paymentDate = { 
      ...where.paymentDate,
      lte: new Date(dateTo) 
    };
  }

  const payments = await db.payment.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          package: {
            select: {
              name: true,
              price: true
            }
          }
        }
      }
    },
    orderBy: { paymentDate: 'desc' }
  });

  return json({ payments });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const method = request.method;

  if (method === "POST") {
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

      const payment = await db.payment.create({
        data: {
          customerId,
          amount,
          paymentDate: new Date(paymentDate),
          status
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
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

      return json({ 
        success: true, 
        message: "Payment created successfully",
        payment 
      });

    } catch (error) {
      console.error("Error creating payment:", error);
      return json({ error: "Failed to create payment" }, { status: 500 });
    }
  }

  if (method === "PUT") {
    requirePermission(user, "customers", "update");

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

      const { id, amount, paymentDate, status } = validation.data;

      const updateData: any = {};
      if (amount !== undefined) updateData.amount = amount;
      if (paymentDate) updateData.paymentDate = new Date(paymentDate);
      if (status) updateData.status = status;

      const payment = await db.payment.update({
        where: { id },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
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

      return json({ 
        success: true, 
        message: "Payment updated successfully",
        payment 
      });

    } catch (error) {
      console.error("Error updating payment:", error);
      return json({ error: "Failed to update payment" }, { status: 500 });
    }
  }

  if (method === "DELETE") {
    requirePermission(user, "customers", "delete");

    try {
      const formData = await request.formData();
      const id = formData.get("id")?.toString();

      if (!id) {
        return json({ error: "Payment ID is required" }, { status: 400 });
      }

      await db.payment.delete({
        where: { id }
      });

      return json({ 
        success: true, 
        message: "Payment deleted successfully" 
      });

    } catch (error) {
      console.error("Error deleting payment:", error);
      return json({ error: "Failed to delete payment" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}