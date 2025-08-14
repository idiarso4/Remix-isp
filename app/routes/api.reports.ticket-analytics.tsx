import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { db } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "reports", "read");

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "month";

  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  switch (period) {
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      startDate = new Date(2020, 0, 1); // All time
  }

  // Get all tickets in period
  const tickets = await db.ticket.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      assignedTo: {
        select: {
          name: true,
          role: true
        }
      }
    }
  });

  // Calculate summary
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => ['OPEN', 'IN_PROGRESS', 'PENDING'].includes(t.status)).length;
  const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;

  // Calculate average resolution time
  const resolvedTicketsWithTime = tickets.filter(t => t.status === 'RESOLVED' && t.resolutionTimeHours);
  const averageResolutionTime = resolvedTicketsWithTime.length > 0
    ? resolvedTicketsWithTime.reduce((sum, t) => sum + Number(t.resolutionTimeHours), 0) / resolvedTicketsWithTime.length
    : 0;

  // Status breakdown
  const statusBreakdown = tickets.reduce((acc, ticket) => ({
    ...acc,
    [ticket.status]: (acc[ticket.status] || 0) + 1
  }), {} as Record<string, number>);

  // Priority breakdown
  const priorityBreakdown = tickets.reduce((acc, ticket) => ({
    ...acc,
    [ticket.priority]: (acc[ticket.priority] || 0) + 1
  }), {} as Record<string, number>);

  // Category breakdown
  const categoryBreakdown = tickets.reduce((acc, ticket) => ({
    ...acc,
    [ticket.category]: (acc[ticket.category] || 0) + 1
  }), {} as Record<string, number>);

  // Monthly trends
  const ticketsByMonth = tickets.reduce((acc, ticket) => {
    const month = ticket.createdAt.toISOString().slice(0, 7);
    if (!acc[month]) {
      acc[month] = {
        totalTickets: 0,
        resolvedTickets: 0,
        resolutionTimes: [] as number[]
      };
    }
    acc[month].totalTickets++;
    if (ticket.status === 'RESOLVED') {
      acc[month].resolvedTickets++;
      if (ticket.resolutionTimeHours) {
        acc[month].resolutionTimes.push(Number(ticket.resolutionTimeHours));
      }
    }
    return acc;
  }, {} as Record<string, any>);

  const monthlyTrends = Object.entries(ticketsByMonth).map(([month, data]) => ({
    month,
    totalTickets: data.totalTickets,
    resolvedTickets: data.resolvedTickets,
    averageResolutionTime: data.resolutionTimes.length > 0
      ? data.resolutionTimes.reduce((sum: number, time: number) => sum + time, 0) / data.resolutionTimes.length
      : 0
  }));

  // Employee performance
  const employeePerformance = await db.employee.findMany({
    where: {
      canHandleTickets: true,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      role: true
    }
  }).then(employees => {
    return employees.map(emp => {
      const empTickets = tickets.filter(t => t.assignedToId === emp.id);
      const empResolved = empTickets.filter(t => t.status === 'RESOLVED');
      const resolutionTimes = empResolved
        .map(t => t.resolutionTimeHours)
        .filter(time => time !== null)
        .map(time => Number(time));

      return {
        employeeId: emp.id,
        employee: {
          name: emp.name,
          role: emp.role
        },
        totalTickets: empTickets.length,
        resolvedTickets: empResolved.length,
        averageResolutionTime: resolutionTimes.length > 0
          ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
          : 0,
        resolutionRate: empTickets.length > 0
          ? (empResolved.length / empTickets.length) * 100
          : 0
      };
    });
  });

  return json({
    summary: {
      totalTickets,
      openTickets,
      resolvedTickets,
      averageResolutionTime,
      period
    },
    statusBreakdown,
    priorityBreakdown,
    categoryBreakdown,
    monthlyTrends: monthlyTrends.sort((a, b) => a.month.localeCompare(b.month)),
    employeePerformance: employeePerformance.sort((a, b) => b.resolvedTickets - a.resolvedTickets)
  });
}
