import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
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
  requirePermission(user, 'customers', 'read');

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");

  try {
    const where: any = {};
    
    if (customerId) {
      where.customerId = customerId;
    }
    
    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }
    
    if (search) {
      where.customer = {
        name: {
          contains: search,
          mode: "insensitive"
        }
      };
    }

    const [payments, totalCount] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              package: {
                select: {
                  name: true,
                  price: true
                }
              }
            }
          }
        },
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.payment.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return json({
      payments,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit
      }
    });

  } catch (error) {
    console.error("Error fetching payments:", error);
    return json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const method = request.method;

  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    if (method === "POST") {
      requirePermission(user, 'customers', 'create');
      
      const validation = createPaymentSchema.safeParse(data);
      if (!validation.success) {
        return json({ 
          error: "Invalid data", 
          errors: validation.error.flatten().fieldErrors 
        }, { status: 400 });
      }

      const { customerId, amount, paymentDate, status } = validation.data;

      // Check if customer exists
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
              phone: true,
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

    } else if (method === "PUT") {
      requirePermission(user, 'customers', 'update');
      
      const validation = updatePaymentSchema.safeParse(data);
      if (!validation.success) {
        return json({ 
          error: "Invalid data", 
          errors: validation.error.flatten().fieldErrors 
        }, { status: 400 });
      }

      const { id, ...updateData } = validation.data;

      // Check if payment exists
      const existingPayment = await db.payment.findUnique({
        where: { id }
      });

      if (!existingPayment) {
        return json({ error: "Payment not found" }, { status: 404 });
      }

      const updatedPayment = await db.payment.update({
        where: { id },
        data: {
          ...updateData,
          paymentDate: updateData.paymentDate ? new Date(updateData.paymentDate) : undefined
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
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
        payment: updatedPayment 
      });

    } else if (method === "DELETE") {
      requirePermission(user, 'customers', 'delete');
      
      const paymentId = data.id as string;
      if (!paymentId) {
        return json({ error: "Payment ID is required" }, { status: 400 });
      }

      // Check if payment exists
      const existingPayment = await db.payment.findUnique({
        where: { id: paymentId }
      });

      if (!existingPayment) {
        return json({ error: "Payment not found" }, { status: 404 });
      }

      await db.payment.delete({
        where: { id: paymentId }
      });

      return json({ 
        success: true, 
        message: "Payment deleted successfully" 
      });
    }

    return json({ error: "Method not allowed" }, { status: 405 });

  } catch (error) {
    console.error("Error managing payment:", error);
    return json({ error: "Failed to manage payment" }, { status: 500 });
  }
}