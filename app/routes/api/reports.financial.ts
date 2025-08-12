import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, 'customers', 'read');

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "month"; // all, year, month, week

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

    // Get payments with customer and package info
    const payments = await db.payment.findMany({
      where: dateFilter,
      include: {
        customer: {
          include: {
            package: {
              select: {
                name: true,
                price: true,
                speed: true
              }
            }
          }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    // Get all customers for additional metrics
    const customers = await db.customer.findMany({
      include: {
        package: {
          select: {
            name: true,
            price: true
          }
        },
        payments: {
          where: dateFilter,
          select: {
            amount: true,
            status: true
          }
        }
      }
    });

    // Calculate financial summary
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    const paidRevenue = payments
      .filter(p => p.status === 'PAID')
      .reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    const pendingRevenue = payments
      .filter(p => p.status === 'PENDING')
      .reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    const overdueRevenue = payments
      .filter(p => p.status === 'OVERDUE')
      .reduce((sum, payment) => sum + payment.amount.toNumber(), 0);

    // Revenue by payment status
    const revenueByStatus = {
      PAID: paidRevenue,
      PENDING: pendingRevenue,
      OVERDUE: overdueRevenue
    };

    // Payment counts by status
    const paymentsByStatus = {
      PAID: payments.filter(p => p.status === 'PAID').length,
      PENDING: payments.filter(p => p.status === 'PENDING').length,
      OVERDUE: payments.filter(p => p.status === 'OVERDUE').length
    };

    // Revenue by package
    const packageRevenue = new Map();
    payments.forEach(payment => {
      if (payment.customer.package) {
        const packageName = payment.customer.package.name;
        const current = packageRevenue.get(packageName) || { revenue: 0, count: 0 };
        packageRevenue.set(packageName, {
          revenue: current.revenue + payment.amount.toNumber(),
          count: current.count + 1,
          packageInfo: payment.customer.package
        });
      }
    });

    const revenueByPackage = Array.from(packageRevenue.entries()).map(([name, data]) => ({
      packageName: name,
      revenue: data.revenue,
      paymentCount: data.count,
      packageInfo: data.packageInfo
    })).sort((a, b) => b.revenue - a.revenue);

    // Monthly revenue trends (last 12 months)
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        return paymentDate >= date && paymentDate < nextDate;
      });

      const monthRevenue = monthPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
      const paidAmount = monthPayments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount.toNumber(), 0);

      monthlyRevenue.push({
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        totalRevenue: monthRevenue,
        paidRevenue: paidAmount,
        paymentCount: monthPayments.length,
        paidCount: monthPayments.filter(p => p.status === 'PAID').length
      });
    }

    // Customer payment analysis
    const customerAnalysis = customers.map(customer => {
      const customerPayments = customer.payments;
      const totalPaid = customerPayments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount.toNumber(), 0);
      const totalPending = customerPayments
        .filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + p.amount.toNumber(), 0);
      const totalOverdue = customerPayments
        .filter(p => p.status === 'OVERDUE')
        .reduce((sum, p) => sum + p.amount.toNumber(), 0);

      return {
        customerId: customer.id,
        customerName: customer.name,
        packageName: customer.package?.name || 'No Package',
        packagePrice: customer.package?.price.toNumber() || 0,
        totalPaid,
        totalPending,
        totalOverdue,
        totalAmount: totalPaid + totalPending + totalOverdue,
        paymentCount: customerPayments.length,
        paymentStatus: totalOverdue > 0 ? 'OVERDUE' : totalPending > 0 ? 'PENDING' : 'PAID'
      };
    }).filter(c => c.totalAmount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Top paying customers
    const topCustomers = customerAnalysis.slice(0, 10);

    // Overdue analysis
    const overdueCustomers = customerAnalysis
      .filter(c => c.totalOverdue > 0)
      .sort((a, b) => b.totalOverdue - a.totalOverdue);

    // Average revenue per customer
    const activeCustomers = customers.filter(c => c.status === 'ACTIVE').length;
    const averageRevenuePerCustomer = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

    // Collection efficiency
    const collectionRate = totalRevenue > 0 ? (paidRevenue / totalRevenue) * 100 : 0;

    return json({
      summary: {
        totalRevenue,
        paidRevenue,
        pendingRevenue,
        overdueRevenue,
        totalPayments: payments.length,
        averageRevenuePerCustomer,
        collectionRate,
        period
      },
      revenueByStatus,
      paymentsByStatus,
      revenueByPackage,
      monthlyRevenue,
      topCustomers,
      overdueCustomers: overdueCustomers.slice(0, 10),
      customerAnalysis: customerAnalysis.slice(0, 20) // Top 20 for detailed view
    });

  } catch (error) {
    console.error("Error generating financial report:", error);
    return json({ error: "Failed to generate financial report" }, { status: 500 });
  }
}