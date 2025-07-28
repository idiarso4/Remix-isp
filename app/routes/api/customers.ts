import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { CustomerStatus } from "@prisma/client";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "read");

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status === "active") {
    where.status = CustomerStatus.ACTIVE;
  } else if (status === "inactive") {
    where.status = CustomerStatus.INACTIVE;
  } else if (status === "suspended") {
    where.status = CustomerStatus.SUSPENDED;
  }

  const customers = await db.customer.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return json({ customers });
};

export const action: ActionFunction = async ({ request }) => {
  const user = await requireAuth(request);
  const formData = await request.formData();
  const method = formData.get("_method")?.toString() || request.method;

  if (method === "POST") {
    requirePermission(user, "customers", "create");
    const name = formData.get("name")?.toString();
    const email = formData.get("email")?.toString() || null;
    const phone = formData.get("phone")?.toString() || null;
    const address = formData.get("address")?.toString() || null;
    const location = formData.get("location")?.toString() || null;
    const statusString = formData.get("status")?.toString() || "ACTIVE";
    const status = statusString as CustomerStatus;
    const packageId = formData.get("packageId")?.toString() || null;

    if (!name) {
      return json({ error: "Name is required" }, { status: 400 });
    }

    await db.customer.create({
      data: {
        name,
        email,
        phone,
        address,
        location,
        status,
        packageId,
      },
    });

    return redirect("/customers");
  } else if (method === "PUT") {
    requirePermission(user, "customers", "update");
    const id = formData.get("id")?.toString();
    if (!id) {
      return json({ error: "Customer ID is required" }, { status: 400 });
    }
    const name = formData.get("name")?.toString();
    const email = formData.get("email")?.toString() || null;
    const phone = formData.get("phone")?.toString() || null;
    const address = formData.get("address")?.toString() || null;
    const location = formData.get("location")?.toString() || null;
    const statusString = formData.get("status")?.toString() || "ACTIVE";
    const status = statusString as CustomerStatus;
    const packageId = formData.get("packageId")?.toString() || null;

    await db.customer.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        location,
        status,
        packageId,
      },
    });

    return redirect("/customers");
  } else if (method === "DELETE") {
    requirePermission(user, "customers", "delete");
    const id = formData.get("id")?.toString();
    if (!id) {
      return json({ error: "Customer ID is required" }, { status: 400 });
    }

    await db.customer.delete({
      where: { id },
    });

    return redirect("/customers");
  }

  return json({ error: "Unsupported method" }, { status: 405 });
};
