import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, 'tickets', 'read');

  try {
    const technicians = await db.employee.findMany({
      where: {
        canHandleTickets: true,
        isActive: true
      },
      include: {
        assignedTickets: {
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS', 'PENDING']
            }
          },
          include: {
            customer: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        performanceMetrics: true,
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: {
                  in: ['OPEN', 'IN_PROGRESS', 'PENDING']
                }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const workloadData = technicians.map(technician => {
      const activeTickets = technician.assignedTickets.length;
      const workloadPercentage = (activeTickets / technician.maxConcurrentTickets) * 100;
      
      return {
        id: technician.id,
        name: technician.name,
        role: technician.role,
        division: technician.division,
        handlingStatus: technician.handlingStatus,
        activeTickets,
        maxConcurrentTickets: technician.maxConcurrentTickets,
        workloadPercentage: Math.round(workloadPercentage),
        availableSlots: technician.maxConcurrentTickets - activeTickets,
        canTakeMoreTickets: activeTickets < technician.maxConcurrentTickets && technician.handlingStatus === 'AVAILABLE',
        tickets: technician.assignedTickets.map(ticket => ({
          id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          customerName: ticket.customer.name,
          createdAt: ticket.createdAt
        })),
        performance: technician.performanceMetrics ? {
          totalResolved: technician.performanceMetrics.totalTicketsResolved,
          averageResolutionTime: technician.performanceMetrics.averageResolutionTime.toNumber(),
          customerRating: technician.performanceMetrics.customerRating.toNumber(),
          resolvedThisMonth: technician.performanceMetrics.ticketsResolvedThisMonth
        } : null
      };
    });

    // Sort by availability and workload
    workloadData.sort((a, b) => {
      // Available technicians first
      if (a.canTakeMoreTickets && !b.canTakeMoreTickets) return -1;
      if (!a.canTakeMoreTickets && b.canTakeMoreTickets) return 1;
      
      // Then by workload percentage (lower first)
      return a.workloadPercentage - b.workloadPercentage;
    });

    return json({ technicians: workloadData });
  } catch (error) {
    console.error("Error fetching technician workload:", error);
    return json({ error: "Failed to fetch workload data" }, { status: 500 });
  }
}