import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, 'customers', 'read');

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "all"; // all, month, week, year

  try {
    // Calculate date filter based on period
    let dateFilter = {};
    const now = new Date();
    
    if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { paymentDate: { gte: startOfMonth } };
    } else if (period === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      dateFilter = { paymentDate: { gte: startOfWeek } };
    } else if (period === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      dateFilter = { paymentDate: { gte: startOfYear } };
    }

    // Get all payments with filter
    const payments = await db.payment.findMany({
      where: dateFilter,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
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

    // Calculate summary statistics
    const totalPayments = payments.length;
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    const averagePayment = totalPayments > 0 ? totalRevenue / totalPayments : 0;

    // Status breakdown
    const statusBreakdown = {
      PAID: payments.filter(p => p.status === 'PAID').length,
      PENDING: payments.filter(p => p.status === 'PENDING').length,
      OVERDUE: payments.filter(p => p.status === 'OVERDUE').length
    };

    // Revenue by status
    const revenueByStatus = {
      PAID: payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount.toNumber(), 0),
      PENDING: payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount.toNumber(), 0),
      OVERDUE: payments.filter(p => p.status === 'OVERDUE').reduce((sum, p) => sum + p.amount.toNumber(), 0)
    };

    // Monthly trends (last 12 months)
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        return paymentDate >= date && paymentDate < nextDate;
      });

      monthlyTrends.push({
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        totalPayments: monthPayments.length,
        totalRevenue: monthPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0),
        paidCount: monthPayments.filter(p => p.status === 'PAID').length,
        pendingCount: monthPayments.filter(p => p.status === 'PENDING').length,
        overdueCount: monthPayments.filter(p => p.status === 'OVERDUE').length
      });
    }

    // Top customers by payment amount
    const customerPayments = new Map();
    payments.forEach(payment => {
      const customerId = payment.customer.id;
      if (!customerPayments.has(customerId)) {
        customerPayments.set(customerId, {
          customer: payment.customer,
          totalAmount: 0,
          paymentCount: 0,
          lastPayment: payment.paymentDate
        });
      }
      const customerData = customerPayments.get(customerId);
      customerData.totalAmount += payment.amount.toNumber();
      customerData.paymentCount++;
      if (new Date(payment.paymentDate) > new Date(customerData.lastPayment)) {
        customerData.lastPayment = payment.paymentDate;
      }
    });

    const topCustomers = Array.from(customerPayments.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    // Overdue analysis
    const overduePayments = payments.filter(p => p.status === 'OVERDUE');
    const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
    
    // Calculate days overdue for overdue payments
    const overdueAnalysis = overduePayments.map(payment => {
      const daysOverdue = Math.floor((now.getTime() - new Date(payment.paymentDate).getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...payment,
        daysOverdue
      };
    }).sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Recent payments (last 10)
    const recentPayments = payments.slice(0, 10).map(payment => ({
      id: payment.id,
      amount: payment.amount.toNumber(),
      paymentDate: payment.paymentDate,
      status: payment.status,
      customer: {
        id: payment.customer.id,
        name: payment.customer.name,
        package: payment.customer.package
      }
    }));

    return json({
      summary: {
        totalPayments,
        totalRevenue,
        averagePayment: Math.round(averagePayment),
        statusBreakdown,
        revenueByStatus,
        overdueAmount,
        overdueCount: overduePayments.length,
        period
      },
      monthlyTrends,
      topCustomers,
      overdueAnalysis: overdueAnalysis.slice(0, 10), // Top 10 most overdue
      recentPayments
    });

  } catch (error) {
    console.error("Error fetching payment statistics:", error);
    return json({ error: "Failed to fetch payment statistics" }, { status: 500 });
  }
}