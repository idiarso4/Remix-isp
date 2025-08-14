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

  // Calculate financial metrics
  const [payments, revenueByStatus, revenueByPackage, monthlyRevenue, customerPayments] = await Promise.all([
    // All payments in period
    db.payment.findMany({
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        customer: {
          include: {
            package: true
          }
        }
      }
    }),

    // Revenue by status
    db.payment.groupBy({
      by: ['status'],
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    }),

    // Revenue by package
    db.payment.findMany({
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate
        },
        customer: {
          package: {
            isNot: null
          }
        }
      },
      include: {
        customer: {
          include: {
            package: true
          }
        }
      },
      orderBy: {
        customer: {
          packageId: 'asc'
        }
      }
    }).then((payments) => {
      // Group payments by package manually
      const groupedByPackage = payments.reduce((acc, payment) => {
        const packageId = payment.customer.packageId ?? "no-package";
        if (!acc[packageId]) {
          acc[packageId] = {
            packageId,
            packageName: payment.customer.package?.name || 'No Package',
            _sum: { amount: 0n }
          };
        }
        acc[packageId]._sum.amount += BigInt(payment.amount.toString());
        return acc;
      }, {} as Record<string, { packageId: string, packageName: string, _sum: { amount: bigint } }>);
      return Object.values(groupedByPackage);
    }),

    // Monthly revenue
    db.payment.groupBy({
      by: ['paymentDate'],
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    }),

    // Customer payments
    db.payment.groupBy({
      by: ['customerId'],
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    })
  ]);

  // Process payments data
  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const paidRevenue = payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingRevenue = payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + Number(p.amount), 0);
  const overdueRevenue = payments.filter(p => p.status === 'OVERDUE').reduce((sum, p) => sum + Number(p.amount), 0);

  // Calculate collection rate
  const collectionRate = totalRevenue > 0 ? (paidRevenue / totalRevenue) * 100 : 0;

  // Calculate average revenue per customer
  const uniqueCustomers = new Set(payments.map(p => p.customerId)).size;
  const averageRevenuePerCustomer = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

  // Format revenue by status
  const revenueByStatusFormatted = revenueByStatus.reduce((acc, status) => ({
    ...acc,
    [status.status]: Number(status._sum.amount || 0)
  }), {} as Record<string, number>);

  // Format revenue by package
  const revenueByPackageFormatted = revenueByPackage.map(pkg => ({
    packageName: pkg.packageName,
    revenue: Number(pkg._sum.amount),
    paymentCount: payments.filter(p => p.customer.packageId === pkg.packageId).length,
    packageId: pkg.packageId
  }));

  // Format monthly revenue
  const monthlyRevenueFormatted = monthlyRevenue.reduce((acc, month) => {
    const monthKey = month.paymentDate.toISOString().slice(0, 7);
    return {
      ...acc,
      [monthKey]: {
        totalRevenue: month._sum.amount || 0,
        paidRevenue: payments
          .filter(p => 
            p.status === 'PAID' && 
            p.paymentDate.toISOString().startsWith(monthKey)
          )
          .reduce((sum, p) => sum + Number(p.amount), 0),
        paymentCount: payments.filter(p => 
          p.paymentDate.toISOString().startsWith(monthKey)
        ).length,
        paidCount: payments.filter(p => 
          p.status === 'PAID' && 
          p.paymentDate.toISOString().startsWith(monthKey)
        ).length
      }
    };
  }, {} as Record<string, any>);

  // Format top customers
  const topCustomers = await Promise.all(
    customerPayments
      .sort((a, b) => Number(b._sum.amount || 0) - Number(a._sum.amount || 0))
      .slice(0, 10)
      .map(async customer => {
        const customerData = await db.customer.findUnique({
          where: { id: customer.customerId },
          include: { package: true }
        });

        const customerPayment = await db.payment.findFirst({
          where: { customerId: customer.customerId },
          orderBy: { paymentDate: 'desc' }
        });

        return {
          customerId: customer.customerId,
          customerName: customerData?.name || 'Unknown',
          packageName: customerData?.package?.name || 'No Package',
          totalAmount: customer._sum.amount || 0,
          paymentCount: payments.filter(p => p.customerId === customer.customerId).length,
          paymentStatus: customerPayment?.status || 'UNKNOWN'
        };
      })
  );

  // Get overdue customers
  const overdueCustomers = await db.customer.findMany({
    where: {
      payments: {
        some: {
          status: 'OVERDUE',
          paymentDate: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    },
    select: {
      id: true,
      name: true,
      payments: {
        where: {
          status: 'OVERDUE',
          paymentDate: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          amount: true
        }
      }
    }
  });

  const overdueCustomersFormatted = overdueCustomers.map(customer => ({
    customerId: customer.id,
    customerName: customer.name,
    totalOverdue: customer.payments.reduce((sum, p) => sum + Number(p.amount), 0),
    paymentStatus: 'OVERDUE'
  }));

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
    revenueByStatus: revenueByStatusFormatted,
    paymentsByStatus: {
      PAID: payments.filter(p => p.status === 'PAID').length,
      PENDING: payments.filter(p => p.status === 'PENDING').length,
      OVERDUE: payments.filter(p => p.status === 'OVERDUE').length
    },
    revenueByPackage: revenueByPackageFormatted,
    monthlyRevenue: Object.entries(monthlyRevenueFormatted).map(([month, data]) => ({
      month,
      ...data
    })),
    topCustomers,
    overdueCustomers: overdueCustomersFormatted
  });
}
