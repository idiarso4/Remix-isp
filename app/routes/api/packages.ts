import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Duration } from "@prisma/client";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireAuth(request);
  requirePermission(user, "packages", "read");

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { speed: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status === "active") {
    where.isActive = true;
  } else if (status === "inactive") {
    where.isActive = false;
  }

  const packages = await db.package.findMany({
    where,
    include: {
      _count: {
        select: { customers: true }
      }
    },
    orderBy: { name: "asc" },
  });

  return json({ packages });
};

export const action: ActionFunction = async ({ request }) => {
  const user = await requireAuth(request);
  const formData = await request.formData();
  const method = formData.get("_method")?.toString() || request.method;

  if (method === "POST") {
    requirePermission(user, "packages", "create");
    
    const name = formData.get("name")?.toString();
    const speed = formData.get("speed")?.toString();
    const priceString = formData.get("price")?.toString();
    const durationString = formData.get("duration")?.toString();
    const description = formData.get("description")?.toString() || null;
    const isActiveString = formData.get("isActive")?.toString();

    if (!name || !speed || !priceString || !durationString) {
      return json({ error: "Required fields are missing" }, { status: 400 });
    }

    const price = parseFloat(priceString);
    if (isNaN(price) || price <= 0) {
      return json({ error: "Invalid price" }, { status: 400 });
    }

    const duration = durationString as Duration;
    const isActive = isActiveString === "true";

    await db.package.create({
      data: {
        name,
        speed,
        price,
        duration,
        description,
        isActive,
      },
    });

    return redirect("/packages");
  } else if (method === "PUT") {
    requirePermission(user, "packages", "update");
    
    const id = formData.get("id")?.toString();
    if (!id) {
      return json({ error: "Package ID is required" }, { status: 400 });
    }

    const name = formData.get("name")?.toString();
    const speed = formData.get("speed")?.toString();
    const priceString = formData.get("price")?.toString();
    const durationString = formData.get("duration")?.toString();
    const description = formData.get("description")?.toString() || null;
    const isActiveString = formData.get("isActive")?.toString();

    if (!name || !speed || !priceString || !durationString) {
      return json({ error: "Required fields are missing" }, { status: 400 });
    }

    const price = parseFloat(priceString);
    if (isNaN(price) || price <= 0) {
      return json({ error: "Invalid price" }, { status: 400 });
    }

    const duration = durationString as Duration;
    const isActive = isActiveString === "true";

    await db.package.update({
      where: { id },
      data: {
        name,
        speed,
        price,
        duration,
        description,
        isActive,
      },
    });

    return redirect(`/packages/${id}`);
  } else if (method === "DELETE") {
    requirePermission(user, "packages", "delete");
    
    const id = formData.get("id")?.toString();
    if (!id) {
      return json({ error: "Package ID is required" }, { status: 400 });
    }

    // Check if package has customers
    const packageWithCustomers = await db.package.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customers: true }
        }
      }
    });

    if (!packageWithCustomers) {
      return json({ error: "Package not found" }, { status: 404 });
    }

    if (packageWithCustomers._count.customers > 0) {
      return json({ 
        error: `Cannot delete package with ${packageWithCustomers._count.customers} active customers` 
      }, { status: 400 });
    }

    await db.package.delete({
      where: { id },
    });

    return redirect("/packages");
  }

  return json({ error: "Unsupported method" }, { status: 405 });
};