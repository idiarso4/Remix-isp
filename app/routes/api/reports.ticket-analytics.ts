import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, 'tickets', 'read');

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "month"; // all, year, month, week

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

    // Get tickets with related data
    const tickets = await db.ticket.findMany({
      where: dateFilter,
      include: {
        customer: {
          select: {
            name: true,
            package: {
              select: { name: true }
            }
          }
        },
        assignedTo: {
          select: {
            name: true,
            role: true
          }
        },
        feedback: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate summary statistics
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'OPEN').length;
    const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;
    const pendingTickets = tickets.filter(t => t.status === 'PENDING').length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;
    const closedTickets = tickets.filter(t => t.status === 'CLOSED').length;

    // Calculate average resolution time
    const resolvedWithTime = tickets.filter(t => t.completedAt && t.status === 'RESOLVED');
    const resolutionTimes = resolvedWithTime.map(t => {
      const created = new Date(t.createdAt);
      const completed = new Date(t.completedAt!);
      return (completed.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
    });
    const averageResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0;

    // Status breakdown
    const statusBreakdown = {
      OPEN: openTickets,
      IN_PROGRESS: inProgressTickets,
      PENDING: pendingTickets,
      RESOLVED: resolvedTickets,
      CLOSED: closedTickets
    };

    // Priority breakdown
    const priorityBreakdown = {
      LOW: tickets.filter(t => t.priority === 'LOW').length,
      MEDIUM: tickets.filter(t => t.priority === 'MEDIUM').length,
      HIGH: tickets.filter(t => t.priority === 'HIGH').length,
      URGENT: tickets.filter(t => t.priority === 'URGENT').length
    };

    // Category breakdown
    const categoryBreakdown = {
      NETWORK_ISSUES: tickets.filter(t => t.category === 'NETWORK_ISSUES').length,
      EQUIPMENT_DAMAGE: tickets.filter(t => t.category === 'EQUIPMENT_DAMAGE').length,
      INSTALLATION: tickets.filter(t => t.category === 'INSTALLATION').length,
      OTHERS: tickets.filter(t => t.category === 'OTHERS').length
    };

    // Monthly trends (last 12 months)
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthTickets = tickets.filter(t => {
        const ticketDate = new Date(t.createdAt);
        return ticketDate >= date && ticketDate < nextDate;
      });

      const monthResolved = monthTickets.filter(t => 
        t.completedAt && 
        new Date(t.completedAt) >= date && 
        new Date(t.completedAt) < nextDate
      );

      const monthResolutionTimes = monthResolved
        .filter(t => t.completedAt)
        .map(t => {
          const created = new Date(t.createdAt);
          const completed = new Date(t.completedAt!);
          return (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
        });

      const monthAvgResolution = monthResolutionTimes.length > 0
        ? monthResolutionTimes.reduce((sum, time) => sum + time, 0) / monthResolutionTimes.length
        : 0;

      monthlyTrends.push({
        month: date.toISOString().slice(0, 7),
        totalTickets: monthTickets.length,
        resolvedTickets: monthResolved.length,
        averageResolutionTime: monthAvgResolution,
        resolutionRate: monthTickets.length > 0 ? (monthResolved.length / monthTickets.length) * 100 : 0
      });
    }

    // Employee performance in ticket handling
    const employeeStats = new Map();
    tickets.forEach(ticket => {
      if (ticket.assignedTo) {
        const employeeId = ticket.assignedTo.name;
        if (!employeeStats.has(employeeId)) {
          employeeStats.set(employeeId, {
            employee: ticket.assignedTo,
            totalTickets: 0,
            resolvedTickets: 0,
            averageResolutionTime: 0,
            resolutionTimes: []
          });
        }
        const stats = employeeStats.get(employeeId);
        stats.totalTickets++;
        
        if (ticket.status === 'RESOLVED' && ticket.completedAt) {
          stats.resolvedTickets++;
          const resolutionTime = (new Date(ticket.completedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
          stats.resolutionTimes.push(resolutionTime);
        }
      }
    });

    const employeePerformance = Array.from(employeeStats.entries()).map(([employeeName, stats]) => {
      const avgResolutionTime = stats.resolutionTimes.length > 0
        ? stats.resolutionTimes.reduce((sum: number, time: number) => sum + time, 0) / stats.resolutionTimes.length
        : 0;
      
      return {
        employeeId: employeeName,
        employee: stats.employee,
        totalTickets: stats.totalTickets,
        resolvedTickets: stats.resolvedTickets,
        averageResolutionTime: avgResolutionTime,
        resolutionRate: stats.totalTickets > 0 ? (stats.resolvedTickets / stats.totalTickets) * 100 : 0
      };
    }).sort((a, b) => b.resolutionRate - a.resolutionRate);

    // Customer satisfaction analysis
    const ticketsWithFeedback = tickets.filter(t => t.feedback);
    const averageCustomerRating = ticketsWithFeedback.length > 0
      ? ticketsWithFeedback.reduce((sum, t) => sum + t.feedback!.rating, 0) / ticketsWithFeedback.length
      : 0;

    const ratingDistribution = {
      1: ticketsWithFeedback.filter(t => t.feedback!.rating === 1).length,
      2: ticketsWithFeedback.filter(t => t.feedback!.rating === 2).length,
      3: ticketsWithFeedback.filter(t => t.feedback!.rating === 3).length,
      4: ticketsWithFeedback.filter(t => t.feedback!.rating === 4).length,
      5: ticketsWithFeedback.filter(t => t.feedback!.rating === 5).length
    };

    // Response time analysis
    const responseTimeAnalysis = {
      within1Hour: tickets.filter(t => {
        if (!t.assignedTo) return false;
        // This would need status history to calculate actual response time
        // For now, we'll use a simplified approach
        return true; // Placeholder
      }).length,
      within4Hours: tickets.length, // Placeholder
      within24Hours: tickets.length, // Placeholder
      moreThan24Hours: 0 // Placeholder
    };

    // Recent high priority tickets
    const highPriorityTickets = tickets
      .filter(t => ['HIGH', 'URGENT'].includes(t.priority))
      .slice(0, 10)
      .map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status,
        customer: ticket.customer.name,
        assignedTo: ticket.assignedTo?.name,
        createdAt: ticket.createdAt
      }));

    return json({
      summary: {
        totalTickets,
        openTickets,
        resolvedTickets,
        averageResolutionTime,
        averageCustomerRating,
        feedbackCount: ticketsWithFeedback.length,
        period
      },
      statusBreakdown,
      priorityBreakdown,
      categoryBreakdown,
      monthlyTrends,
      employeePerformance,
      ratingDistribution,
      responseTimeAnalysis,
      highPriorityTickets
    });

  } catch (error) {
    console.error("Error generating ticket analytics:", error);
    return json({ error: "Failed to generate ticket analytics" }, { status: 500 });
  }
}