import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, 'tickets', 'read');

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");
  const period = url.searchParams.get("period") || "all"; // all, month, week

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
    }

    // Build where clause
    const where: any = { ...dateFilter };
    if (employeeId) {
      where.ticket = { assignedToId: employeeId };
    }

    // Get all feedback
    const feedbacks = await db.ticketFeedback.findMany({
      where,
      include: {
        ticket: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                role: true
              }
            },
            customer: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate statistics
    const totalFeedbacks = feedbacks.length;
    const averageRating = totalFeedbacks > 0 
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks 
      : 0;

    // Rating distribution
    const ratingDistribution = {
      1: feedbacks.filter(f => f.rating === 1).length,
      2: feedbacks.filter(f => f.rating === 2).length,
      3: feedbacks.filter(f => f.rating === 3).length,
      4: feedbacks.filter(f => f.rating === 4).length,
      5: feedbacks.filter(f => f.rating === 5).length,
    };

    // Employee performance
    const employeeStats = new Map();
    feedbacks.forEach(feedback => {
      if (feedback.ticket.assignedTo) {
        const employeeId = feedback.ticket.assignedTo.id;
        if (!employeeStats.has(employeeId)) {
          employeeStats.set(employeeId, {
            employee: feedback.ticket.assignedTo,
            ratings: [],
            totalFeedbacks: 0
          });
        }
        const stats = employeeStats.get(employeeId);
        stats.ratings.push(feedback.rating);
        stats.totalFeedbacks++;
      }
    });

    // Calculate employee averages
    const employeePerformance = Array.from(employeeStats.entries()).map(([employeeId, stats]) => ({
      employeeId,
      employee: stats.employee,
      totalFeedbacks: stats.totalFeedbacks,
      averageRating: stats.ratings.reduce((sum: number, rating: number) => sum + rating, 0) / stats.ratings.length,
      ratingDistribution: {
        1: stats.ratings.filter((r: number) => r === 1).length,
        2: stats.ratings.filter((r: number) => r === 2).length,
        3: stats.ratings.filter((r: number) => r === 3).length,
        4: stats.ratings.filter((r: number) => r === 4).length,
        5: stats.ratings.filter((r: number) => r === 5).length,
      }
    })).sort((a, b) => b.averageRating - a.averageRating);

    // Recent feedback
    const recentFeedback = feedbacks.slice(0, 10).map(feedback => ({
      id: feedback.id,
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
      ticket: {
        id: feedback.ticket.id,
        title: feedback.ticket.title,
        customer: feedback.ticket.customer.name,
        assignedTo: feedback.ticket.assignedTo
      }
    }));

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthFeedbacks = feedbacks.filter(f => {
        const feedbackDate = new Date(f.createdAt);
        return feedbackDate >= date && feedbackDate < nextDate;
      });

      monthlyTrends.push({
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        totalFeedbacks: monthFeedbacks.length,
        averageRating: monthFeedbacks.length > 0 
          ? monthFeedbacks.reduce((sum, f) => sum + f.rating, 0) / monthFeedbacks.length 
          : 0
      });
    }

    return json({
      summary: {
        totalFeedbacks,
        averageRating: Math.round(averageRating * 100) / 100,
        ratingDistribution,
        period
      },
      employeePerformance,
      recentFeedback,
      monthlyTrends
    });

  } catch (error) {
    console.error("Error fetching feedback statistics:", error);
    return json({ error: "Failed to fetch feedback statistics" }, { status: 500 });
  }
}