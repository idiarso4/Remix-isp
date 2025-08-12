import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, 'employees', 'read');

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "month"; // all, year, month, week
  const employeeId = url.searchParams.get("employeeId");

  try {
    // Calculate date filter based on period
    let dateFilter = {};
    const now = new Date();
    
    if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { gte: startOfMonth } };
    } else if (period === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      dateFilter = { createdAt: { gte: startOfWeek } };
    } else if (period === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      dateFilter = { createdAt: { gte: startOfYear } };
    }

    // Build where clause for tickets
    const ticketWhere: any = { ...dateFilter };
    if (employeeId) {
      ticketWhere.assignedToId = employeeId;
    }

    // Get employees with their tickets and feedback
    const employees = await db.employee.findMany({
      where: {
        canHandleTickets: true,
        isActive: true,
        ...(employeeId ? { id: employeeId } : {})
      },
      include: {
        assignedTickets: {
          where: ticketWhere,
          include: {
            feedback: true,
            statusHistory: {
              orderBy: { changedAt: 'desc' },
              take: 1
            }
          }
        },
        performanceMetrics: true
      },
      orderBy: { name: 'asc' }
    });

    // Calculate performance metrics for each employee
    const employeePerformance = employees.map(employee => {
      const tickets = employee.assignedTickets;
      const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
      const totalTickets = tickets.length;

      // Calculate average resolution time
      const resolutionTimes = resolvedTickets
        .filter(t => t.completedAt)
        .map(t => {
          const created = new Date(t.createdAt);
          const completed = new Date(t.completedAt!);
          return (completed.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
        });

      const averageResolutionTime = resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
        : 0;

      // Calculate customer satisfaction
      const feedbacks = tickets
        .map(t => t.feedback)
        .filter(f => f !== null);
      
      const averageRating = feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f!.rating, 0) / feedbacks.length
        : 0;

      // Calculate resolution rate
      const resolutionRate = totalTickets > 0 ? (resolvedTickets.length / totalTickets) * 100 : 0;

      // Ticket breakdown by status
      const statusBreakdown = {
        OPEN: tickets.filter(t => t.status === 'OPEN').length,
        IN_PROGRESS: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        PENDING: tickets.filter(t => t.status === 'PENDING').length,
        RESOLVED: tickets.filter(t => t.status === 'RESOLVED').length,
        CLOSED: tickets.filter(t => t.status === 'CLOSED').length
      };

      // Ticket breakdown by priority
      const priorityBreakdown = {
        LOW: tickets.filter(t => t.priority === 'LOW').length,
        MEDIUM: tickets.filter(t => t.priority === 'MEDIUM').length,
        HIGH: tickets.filter(t => t.priority === 'HIGH').length,
        URGENT: tickets.filter(t => t.priority === 'URGENT').length
      };

      // Recent activity
      const recentTickets = tickets
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(ticket => ({
          id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          completedAt: ticket.completedAt
        }));

      return {
        employeeId: employee.id,
        employee: {
          name: employee.name,
          role: employee.role,
          division: employee.division,
          position: employee.position
        },
        metrics: {
          totalTickets,
          resolvedTickets: resolvedTickets.length,
          resolutionRate,
          averageResolutionTime,
          averageRating,
          feedbackCount: feedbacks.length
        },
        statusBreakdown,
        priorityBreakdown,
        recentTickets,
        currentWorkload: {
          activeTickets: tickets.filter(t => ['OPEN', 'IN_PROGRESS', 'PENDING'].includes(t.status)).length,
          maxConcurrentTickets: employee.maxConcurrentTickets,
          handlingStatus: employee.handlingStatus
        }
      };
    });

    // Sort by resolution rate
    employeePerformance.sort((a, b) => b.metrics.resolutionRate - a.metrics.resolutionRate);

    // Calculate team summary
    const teamSummary = {
      totalEmployees: employeePerformance.length,
      totalTicketsHandled: employeePerformance.reduce((sum, emp) => sum + emp.metrics.totalTickets, 0),
      totalTicketsResolved: employeePerformance.reduce((sum, emp) => sum + emp.metrics.resolvedTickets, 0),
      averageResolutionRate: employeePerformance.length > 0
        ? employeePerformance.reduce((sum, emp) => sum + emp.metrics.resolutionRate, 0) / employeePerformance.length
        : 0,
      averageResolutionTime: employeePerformance.length > 0
        ? employeePerformance.reduce((sum, emp) => sum + emp.metrics.averageResolutionTime, 0) / employeePerformance.length
        : 0,
      averageCustomerRating: employeePerformance.length > 0
        ? employeePerformance
            .filter(emp => emp.metrics.averageRating > 0)
            .reduce((sum, emp) => sum + emp.metrics.averageRating, 0) / 
          employeePerformance.filter(emp => emp.metrics.averageRating > 0).length
        : 0
    };

    // Top performers
    const topPerformers = employeePerformance
      .filter(emp => emp.metrics.totalTickets > 0)
      .slice(0, 5);

    // Performance trends (monthly for last 6 months)
    const performanceTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      // Get tickets for this month
      const monthTickets = await db.ticket.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          },
          assignedToId: { not: null }
        },
        include: {
          assignedTo: {
            select: { name: true }
          }
        }
      });

      const resolvedInMonth = monthTickets.filter(t => 
        t.completedAt && 
        new Date(t.completedAt) >= date && 
        new Date(t.completedAt) < nextDate
      );

      performanceTrends.push({
        month: date.toISOString().slice(0, 7),
        totalTickets: monthTickets.length,
        resolvedTickets: resolvedInMonth.length,
        resolutionRate: monthTickets.length > 0 ? (resolvedInMonth.length / monthTickets.length) * 100 : 0,
        activeEmployees: new Set(monthTickets.map(t => t.assignedToId)).size
      });
    }

    return json({
      teamSummary,
      employeePerformance,
      topPerformers,
      performanceTrends,
      period
    });

  } catch (error) {
    console.error("Error generating employee performance report:", error);
    return json({ error: "Failed to generate employee performance report" }, { status: 500 });
  }
}