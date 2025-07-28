import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Role, HandlingStatus } from "@prisma/client";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireAuth(request);
  requirePermission(user, "employees", "read");

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");
  const division = url.searchParams.get("division");

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { position: { contains: search, mode: "insensitive" } },
      { division: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role && role !== "all") {
    where.role = role.toUpperCase();
  }
  if (status === "active") {
    where.isActive = true;
  } else if (status === "inactive") {
    where.isActive = false;
  }
  if (division && division !== "all") {
    where.division = division;
  }

  const employees = await db.employee.findMany({
    where,
    include: {
      user: {
        select: { email: true }
      },
      assignedTickets: {
        where: {
          status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] }
        },
        select: { id: true }
      },
      performanceMetrics: true
    },
    orderBy: { name: "asc" },
  });

  return json({ employees });
};

export const action: ActionFunction = async ({ request }) => {
  const user = await requireAuth(request);
  const formData = await request.formData();
  const method = formData.get("_method")?.toString() || request.method;

  if (method === "POST") {
    requirePermission(user, "employees", "create");

    const name = formData.get("name")?.toString();
    const email = formData.get("email")?.toString();
    const phone = formData.get("phone")?.toString() || null;
    const position = formData.get("position")?.toString() || null;
    const division = formData.get("division")?.toString() || null;
    const roleString = formData.get("role")?.toString();
    const hireDateString = formData.get("hireDate")?.toString();
    const photoUrl = formData.get("photoUrl")?.toString() || null;
    const canHandleTicketsString = formData.get("canHandleTickets")?.toString();
    const maxConcurrentTicketsString = formData.get("maxConcurrentTickets")?.toString();

    if (!name || !email || !roleString || !hireDateString) {
      return json({ error: "Required fields are missing" }, { status: 400 });
    }

    const role = roleString as Role;
    const hireDate = new Date(hireDateString);
    const canHandleTickets = canHandleTicketsString === "true";
    const maxConcurrentTickets = maxConcurrentTicketsString ? parseInt(maxConcurrentTicketsString) : 5;

    // Create user account first
    const userAccount = await db.user.create({
      data: {
        email,
        // Password will be set separately or via invitation
      }
    });

    const employee = await db.employee.create({
      data: {
        userId: userAccount.id,
        name,
        phone,
        position,
        division,
        role,
        hireDate,
        photoUrl,
        canHandleTickets,
        maxConcurrentTickets,
        handlingStatus: canHandleTickets ? HandlingStatus.AVAILABLE : HandlingStatus.OFFLINE,
      },
    });

    // Create performance metrics record
    await db.employeePerformance.create({
      data: {
        employeeId: employee.id,
      }
    });

    return redirect(`/employees/${employee.id}`);
  } else if (method === "PUT") {
    requirePermission(user, "employees", "update");

    const id = formData.get("id")?.toString();
    if (!id) {
      return json({ error: "Employee ID is required" }, { status: 400 });
    }

    const name = formData.get("name")?.toString();
    const phone = formData.get("phone")?.toString() || null;
    const position = formData.get("position")?.toString() || null;
    const division = formData.get("division")?.toString() || null;
    const roleString = formData.get("role")?.toString();
    const hireDateString = formData.get("hireDate")?.toString();
    const photoUrl = formData.get("photoUrl")?.toString() || null;
    const isActiveString = formData.get("isActive")?.toString();
    const canHandleTicketsString = formData.get("canHandleTickets")?.toString();
    const handlingStatusString = formData.get("handlingStatus")?.toString();
    const maxConcurrentTicketsString = formData.get("maxConcurrentTickets")?.toString();

    if (!name || !roleString || !hireDateString) {
      return json({ error: "Required fields are missing" }, { status: 400 });
    }

    const role = roleString as Role;
    const hireDate = new Date(hireDateString);
    const isActive = isActiveString === "true";
    const canHandleTickets = canHandleTicketsString === "true";
    const handlingStatus = handlingStatusString as HandlingStatus;
    const maxConcurrentTickets = maxConcurrentTicketsString ? parseInt(maxConcurrentTicketsString) : 5;

    await db.employee.update({
      where: { id },
      data: {
        name,
        phone,
        position,
        division,
        role,
        hireDate,
        photoUrl,
        isActive,
        canHandleTickets,
        handlingStatus: canHandleTickets ? handlingStatus : HandlingStatus.OFFLINE,
        maxConcurrentTickets,
      },
    });

    return redirect(`/employees/${id}`);
  } else if (method === "DELETE") {
    requirePermission(user, "employees", "delete");

    const id = formData.get("id")?.toString();
    if (!id) {
      return json({ error: "Employee ID is required" }, { status: 400 });
    }

    // Check if employee has active tickets
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        assignedTickets: {
          where: {
            status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] }
          }
        }
      }
    });

    if (!employee) {
      return json({ error: "Employee not found" }, { status: 404 });
    }

    if (employee.assignedTickets.length > 0) {
      return json({
        error: `Cannot delete employee with ${employee.assignedTickets.length} active tickets`
      }, { status: 400 });
    }

    // Delete related records first
    await db.employeePerformance.deleteMany({
      where: { employeeId: id }
    });

    await db.ticketNote.deleteMany({
      where: { employeeId: id }
    });

    await db.ticketStatusHistory.deleteMany({
      where: { changedBy: id }
    });

    // Delete employee
    await db.employee.delete({
      where: { id },
    });

    // Optionally delete user account if no other employees use it
    if (employee.userId) {
      const otherEmployees = await db.employee.findMany({
        where: { userId: employee.userId }
      });

      if (otherEmployees.length === 0) {
        await db.user.delete({
          where: { id: employee.userId }
        });
      }
    }

    return redirect("/employees");
  }

  return json({ error: "Unsupported method" }, { status: 405 });
};