import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { DatabaseOptimizer } from "~/lib/db-optimization.server";
import { withQueryTracking, PerformanceMonitor } from "~/lib/performance-monitor.server";
import { db } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "customers", "read");

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const packageId = url.searchParams.get("packageId") || "";
  const sortBy = url.searchParams.get("sortBy") || "";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";

  const offset = (page - 1) * limit;

  try {
    // Track API endpoint performance
    const startTime = Date.now();

    // Get optimized customer data
    const [customers, totalCount] = await Promise.all([
      withQueryTracking('customers-lazy-list', () =>
        DatabaseOptimizer.getCustomersOptimized({
          search,
          status: status || undefined,
          packageId: packageId || undefined,
          limit,
          offset
        })
      ),
      withQueryTracking('customers-lazy-count', async () => {
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

        const result = await db.customer.count({ where });
        return result;
      })
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    // Track endpoint performance
    const duration = Date.now() - startTime;
    PerformanceMonitor.trackEndpoint('/api/customers-lazy', 'GET', duration, 200);

    return json({
      data: customers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        hasMore,
        pageSize: limit
      },
      performance: {
        queryTime: duration,
        recordCount: customers.length
      }
    });

  } catch (error) {
    console.error("Error loading customers:", error);
    
    // Track error
    const duration = Date.now() - Date.now();
    PerformanceMonitor.trackEndpoint('/api/customers-lazy', 'GET', duration, 500);
    
    return json(
      { 
        error: "Failed to load customers",
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          hasMore: false,
          pageSize: limit
        }
      }, 
      { status: 500 }
    );
  }
}