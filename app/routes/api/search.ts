import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const type = url.searchParams.get("type") || "all"; // all, customers, tickets, employees, packages
  const limit = parseInt(url.searchParams.get("limit") || "10");

  if (!query.trim()) {
    return json({ results: [], totalCount: 0 });
  }

  try {
    const searchResults: any = {
      customers: [],
      tickets: [],
      employees: [],
      packages: [],
      totalCount: 0
    };

    // Search customers
    if (type === "all" || type === "customers") {
      try {
        requirePermission(user, 'customers', 'read');
        
        const customers = await db.customer.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { address: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } }
            ]
          },
          include: {
            package: {
              select: {
                name: true,
                price: true
              }
            }
          },
          take: limit,
          orderBy: { name: 'asc' }
        });

        searchResults.customers = customers.map(customer => ({
          id: customer.id,
          type: 'customer',
          title: customer.name,
          subtitle: customer.email || customer.phone,
          description: `${customer.package?.name || 'No package'} - ${customer.status}`,
          url: `/customers/${customer.id}`,
          metadata: {
            status: customer.status,
            package: customer.package?.name,
            location: customer.location
          }
        }));
      } catch (error) {
        // User doesn't have permission to search customers
      }
    }

    // Search tickets
    if (type === "all" || type === "tickets") {
      try {
        requirePermission(user, 'tickets', 'read');
        
        const tickets = await db.ticket.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { customer: { name: { contains: query, mode: "insensitive" } } },
              { assignedTo: { name: { contains: query, mode: "insensitive" } } }
            ]
          },
          include: {
            customer: {
              select: {
                name: true
              }
            },
            assignedTo: {
              select: {
                name: true
              }
            }
          },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });

        searchResults.tickets = tickets.map(ticket => ({
          id: ticket.id,
          type: 'ticket',
          title: ticket.title,
          subtitle: `Customer: ${ticket.customer.name}`,
          description: `${ticket.status} - ${ticket.priority} priority`,
          url: `/tickets/${ticket.id}`,
          metadata: {
            status: ticket.status,
            priority: ticket.priority,
            category: ticket.category,
            assignedTo: ticket.assignedTo?.name
          }
        }));
      } catch (error) {
        // User doesn't have permission to search tickets
      }
    }

    // Search employees
    if (type === "all" || type === "employees") {
      try {
        requirePermission(user, 'employees', 'read');
        
        const employees = await db.employee.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { position: { contains: query, mode: "insensitive" } },
              { division: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } }
            ]
          },
          take: limit,
          orderBy: { name: 'asc' }
        });

        searchResults.employees = employees.map(employee => ({
          id: employee.id,
          type: 'employee',
          title: employee.name,
          subtitle: employee.position || employee.role,
          description: `${employee.division} - ${employee.isActive ? 'Active' : 'Inactive'}`,
          url: `/employees/${employee.id}`,
          metadata: {
            role: employee.role,
            division: employee.division,
            position: employee.position,
            status: employee.isActive ? 'Active' : 'Inactive'
          }
        }));
      } catch (error) {
        // User doesn't have permission to search employees
      }
    }

    // Search packages
    if (type === "all" || type === "packages") {
      try {
        requirePermission(user, 'packages', 'read');
        
        const packages = await db.package.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { speed: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } }
            ]
          },
          include: {
            _count: {
              select: {
                customers: true
              }
            }
          },
          take: limit,
          orderBy: { name: 'asc' }
        });

        searchResults.packages = packages.map(pkg => ({
          id: pkg.id,
          type: 'package',
          title: pkg.name,
          subtitle: `${pkg.speed} - Rp ${pkg.price.toLocaleString()}`,
          description: `${pkg._count.customers} customers - ${pkg.isActive ? 'Active' : 'Inactive'}`,
          url: `/packages/${pkg.id}`,
          metadata: {
            speed: pkg.speed,
            price: pkg.price.toNumber(),
            duration: pkg.duration,
            status: pkg.isActive ? 'Active' : 'Inactive',
            customerCount: pkg._count.customers
          }
        }));
      } catch (error) {
        // User doesn't have permission to search packages
      }
    }

    // Flatten results and calculate total
    const allResults = [
      ...searchResults.customers,
      ...searchResults.tickets,
      ...searchResults.employees,
      ...searchResults.packages
    ];

    searchResults.totalCount = allResults.length;

    // If searching all types, limit total results
    if (type === "all") {
      const limitedResults = allResults.slice(0, limit);
      return json({
        results: limitedResults,
        totalCount: searchResults.totalCount,
        breakdown: {
          customers: searchResults.customers.length,
          tickets: searchResults.tickets.length,
          employees: searchResults.employees.length,
          packages: searchResults.packages.length
        }
      });
    }

    // Return specific type results
    return json({
      results: searchResults[type as keyof typeof searchResults] || [],
      totalCount: searchResults.totalCount
    });

  } catch (error) {
    console.error("Error performing search:", error);
    return json({ error: "Search failed" }, { status: 500 });
  }
}