import { db } from "~/lib/db.server";
import { CacheService, CACHE_KEYS } from "~/lib/cache.server";

// Optimized database queries with caching and indexing hints

export class DatabaseOptimizer {
  // Optimized customer queries
  static async getCustomersOptimized(filters: {
    search?: string;
    status?: string;
    packageId?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const cacheKey = `customers:list:${JSON.stringify(filters)}`;
    
    return CacheService.getOrSet(cacheKey, async () => {
      const { search, status, packageId, limit = 50, offset = 0 } = filters;
      
      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } }
        ];
      }
      
      if (status) {
        where.status = status;
      }
      
      if (packageId) {
        where.packageId = packageId;
      }

      return db.customer.findMany({
        where,
        include: {
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              speed: true
            }
          },
          _count: {
            select: {
              tickets: true,
              payments: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      });
    }, 1000 * 60 * 2); // 2 minutes cache
  }

  // Optimized ticket queries
  static async getTicketsOptimized(filters: {
    search?: string;
    status?: string;
    priority?: string;
    assignedToId?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const cacheKey = `tickets:list:${JSON.stringify(filters)}`;
    
    return CacheService.getOrSet(cacheKey, async () => {
      const { search, status, priority, assignedToId, customerId, limit = 50, offset = 0 } = filters;
      
      const where: any = {};
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { ticketId: { contains: search, mode: "insensitive" } }
        ];
      }
      
      if (status) {
        where.status = status;
      }
      
      if (priority) {
        where.priority = priority;
      }
      
      if (assignedToId) {
        where.assignedToId = assignedToId;
      }
      
      if (customerId) {
        where.customerId = customerId;
      }

      return db.ticket.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              position: true
            }
          },
          _count: {
            select: {
              notes: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      });
    }, 1000 * 60 * 1); // 1 minute cache for tickets (more dynamic)
  }

  // Optimized dashboard statistics
  static async getDashboardStats() {
    return CacheService.getOrSet(CACHE_KEYS.DASHBOARD_STATS, async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);

      // Use Promise.all for parallel execution
      const [
        customerStats,
        ticketStats,
        employeeStats,
        paymentStats,
        packageStats
      ] = await Promise.all([
        // Customer statistics
        db.customer.aggregate({
          _count: {
            id: true
          },
          where: {}
        }).then(async (total) => {
          const [active, newThisMonth] = await Promise.all([
            db.customer.count({ where: { status: 'ACTIVE' } }),
            db.customer.count({ where: { createdAt: { gte: startOfMonth } } })
          ]);
          return { total: total._count.id, active, newThisMonth };
        }),

        // Ticket statistics
        db.ticket.aggregate({
          _count: {
            id: true
          },
          where: {}
        }).then(async (total) => {
          const [open, resolved, urgent] = await Promise.all([
            db.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] } } }),
            db.ticket.count({ where: { status: 'RESOLVED' } }),
            db.ticket.count({ where: { priority: 'URGENT', status: { in: ['OPEN', 'IN_PROGRESS'] } } })
          ]);
          return { total: total._count.id, open, resolved, urgent };
        }),

        // Employee statistics
        db.employee.aggregate({
          _count: {
            id: true
          },
          where: {}
        }).then(async (total) => {
          const [active, available] = await Promise.all([
            db.employee.count({ where: { isActive: true } }),
            db.employee.count({ where: { canHandleTickets: true, handlingStatus: 'AVAILABLE' } })
          ]);
          return { total: total._count.id, active, available };
        }),

        // Payment statistics
        db.payment.aggregate({
          _sum: {
            amount: true
          },
          _count: {
            id: true
          },
          where: {}
        }).then(async (total) => {
          const [monthlyRevenue, pending, overdue] = await Promise.all([
            db.payment.aggregate({
              _sum: { amount: true },
              where: { paymentDate: { gte: startOfMonth } }
            }),
            db.payment.count({ where: { status: 'PENDING' } }),
            db.payment.count({ where: { status: 'OVERDUE' } })
          ]);
          return {
            totalRevenue: Number(total._sum.amount) || 0,
            monthlyRevenue: Number(monthlyRevenue._sum.amount) || 0,
            totalPayments: total._count.id,
            pending,
            overdue
          };
        }),

        // Package statistics
        db.package.count({ where: { isActive: true } })
      ]);

      return {
        customers: customerStats,
        tickets: ticketStats,
        employees: employeeStats,
        payments: paymentStats,
        packages: { total: packageStats }
      };
    }, 1000 * 60 * 5); // 5 minutes cache for dashboard stats
  }

  // Optimized employee performance metrics
  static async getEmployeePerformanceOptimized(employeeId?: string) {
    const cacheKey = employeeId 
      ? `performance:employee:${employeeId}` 
      : CACHE_KEYS.PERFORMANCE_METRICS;
    
    return CacheService.getOrSet(cacheKey, async () => {
      const where = employeeId ? { id: employeeId } : { isActive: true };
      
      return db.employee.findMany({
        where,
        include: {
          performanceMetrics: true,
          _count: {
            select: {
              assignedTickets: {
                where: {
                  status: 'RESOLVED',
                  completedAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                  }
                }
              }
            }
          }
        },
        orderBy: {
          performanceMetrics: {
            customerRating: 'desc'
          }
        }
      });
    }, 1000 * 60 * 10); // 10 minutes cache for performance metrics
  }

  // Batch operations for better performance
  static async batchUpdateTicketStatus(ticketIds: string[], status: string, userId: string) {
    // Invalidate related caches
    CacheService.invalidatePattern('tickets');
    CacheService.delete(CACHE_KEYS.DASHBOARD_STATS);
    
    return db.$transaction(async (tx) => {
      // Update tickets
      await tx.ticket.updateMany({
        where: { id: { in: ticketIds } },
        data: { 
          status,
          updatedAt: new Date()
        }
      });

      // Create audit trail entries
      const auditEntries = ticketIds.map(ticketId => ({
        ticketId,
        action: `Status changed to ${status}`,
        performedBy: userId,
        createdAt: new Date()
      }));

      await tx.ticketAudit.createMany({
        data: auditEntries
      });

      return ticketIds.length;
    });
  }

  // Optimized search across multiple entities
  static async globalSearch(query: string, limit: number = 20) {
    const cacheKey = `search:global:${query}:${limit}`;
    
    return CacheService.getOrSet(cacheKey, async () => {
      const [customers, tickets, employees] = await Promise.all([
        db.customer.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            status: true
          },
          take: Math.ceil(limit / 3)
        }),

        db.ticket.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { ticketId: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } }
            ]
          },
          select: {
            id: true,
            ticketId: true,
            title: true,
            status: true,
            priority: true,
            customer: {
              select: { name: true }
            }
          },
          take: Math.ceil(limit / 3)
        }),

        db.employee.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { position: { contains: query, mode: "insensitive" } }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            isActive: true
          },
          take: Math.ceil(limit / 3)
        })
      ]);

      return {
        customers,
        tickets,
        employees,
        total: customers.length + tickets.length + employees.length
      };
    }, 1000 * 60 * 2); // 2 minutes cache for search results
  }
}