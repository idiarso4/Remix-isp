import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { PaymentStatus } from "@prisma/client";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireAuth(request);
  requirePermission(user, "payments", "read");

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");
  const month = url.searchParams.get("month");

  const where: any = {};
  if (search) {
    where.OR = [
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { customer: { email: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }
  if (month) {
    const startDate = new Date(month + "-01");
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    where.paymentDate = {
      gte: startDate,
      lte: endDate
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
            select: { name: true, price: true }
          }
        }
      }
    },
    orderBy: { paymentDate: "desc" },
  });

  return json({ payments });
};

export const action: ActionFunction = async ({ request }) => {
  const user = await requireAuth(request);
  const formData = await request.formData();
  const method = formData.get("_method")?.toString() || request.method;

  if (method === "POST") {
    requirePermission(user, "payments", "create");
    
    const customerId = formData.get("customerId")?.toString();
    const amountString = formData.get("amount")?.toString();
    const paymentDateString = formData.get("paymentDate")?.toString();
    const statusString = formData.get("status")?.toString();

    if (!customerId || !amountString || !paymentDateString || !statusString) {
      return json({ error: "Required fields are missing" }, { status: 400 });
    }

    const amount = parseFloat(amountString);
    if (isNaN(amount) || amount <= 0) {
      return json({ error: "Invalid amount" }, { status: 400 });
    }

    const paymentDate = new Date(paymentDateString);
    const status = statusString as PaymentStatus;

    const payment = await db.payment.create({
      data: {
        customerId,
        amount,
        paymentDate,
        status,
      },
    });

    return redirect(`/payments/${payment.id}`);
  } else if (method === "PUT") {
    requirePermission(user, "payments", "update");
    
    const id = formData.get("id")?.toString();
    if (!id) {
      return json({ error: "Payment ID is required" }, { status: 400 });
    }

    const amountString = formData.get("amount")?.toString();
    const paymentDateString = formData.get("paymentDate")?.toString();
    const statusString = formData.get("status")?.toString();

    if (!amountString || !paymentDateString || !statusString) {
      return json({ error: "Required fields are missing" }, { status: 400 });
    }

    const amount = parseFloat(amountString);
    if (isNaN(amount) || amount <= 0) {
      return json({ error: "Invalid amount" }, { status: 400 });
    }

    const paymentDate = new Date(paymentDateString);
    const status = statusString as PaymentStatus;

    await db.payment.update({
      where: { id },
      data: {
        amount,
        paymentDate,
        status,
      },
    });

    return redirect(`/payments/${id}`);
  } else if (method === "DELETE") {
    requirePermission(user, "payments", "delete");
    
    const id = formData.get("id")?.toString();
    if (!id) {
      return json({ error: "Payment ID is required" }, { status: 400 });
    }

    await db.payment.delete({
      where: { id },
    });

    return redirect("/payments");
  }

  return json({ error: "Unsupported method" }, { status: 405 });
};