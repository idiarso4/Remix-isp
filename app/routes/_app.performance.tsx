import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { PerformanceMonitor } from "~/lib/performance-monitor.server";
import { CacheService } from "~/lib/cache.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { 
  Activity, 
  Database, 
  Zap, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Server,
  HardDrive
} from "lucide-react";
import { useEffect } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "dashboard", "read");

  // Get performance metrics
  const systemOverview = PerformanceMonitor.getSystemOverview();
  const allStats = PerformanceMonitor.getStats();
  const exportedMetrics = PerformanceMonitor.exportMetrics();

  return json({
    user,
    systemOverview,
    allStats,
    exportedMetrics,
    timestamp: Date.now()
  });
}

export default function PerformanceDashboard() {
  const { systemOverview, allStats, exportedMetrics } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      revalidator.revalidate();
    }, 30000);

    return () => clearInterval(interval);
  }, [revalidator]);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return "text-green-600 bg-green-100";
    if (value <= thresholds.warning) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getStatusIcon = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return <CheckCircle className="h-4 w-4" />;
    if (value <= thresholds.warning) return <Clock className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Performance Monitoring"
        description="System performance metrics and optimization insights"
      >
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state === "loading"}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${revalidator.state === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Cache Performance */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Cache Hit Rate</p>
                <p className="text-2xl font-bold text-gray-900">{systemOverview.cache.hitRate}%</p>
                <p className="text-xs text-gray-500">
                  {systemOverview.cache.hits} hits, {systemOverview.cache.misses} misses
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getStatusColor(100 - systemOverview.cache.hitRate, { good: 10, warning: 25 })}`}>
                <Zap className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Performance */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Query Time</p>
                <p className="text-2xl font-bold text-gray-900">{systemOverview.database.avgQueryTime}ms</p>
                <p className="text-xs text-gray-500">
                  {systemOverview.database.totalQueries} queries
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getStatusColor(systemOverview.database.avgQueryTime, { good: 100, warning: 500 })}`}>
                <Database className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Performance */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{systemOverview.endpoints.avgResponseTime}ms</p>
                <p className="text-xs text-gray-500">
                  {systemOverview.endpoints.totalRequests} requests
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getStatusColor(systemOverview.endpoints.avgResponseTime, { good: 200, warning: 1000 })}`}>
                <Activity className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Memory Usage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemOverview.memory?.heapUsed || 0}MB
                </p>
                <p className="text-xs text-gray-500">
                  of {systemOverview.memory?.heapTotal || 0}MB total
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getStatusColor(
                systemOverview.memory?.heapUsed || 0, 
                { good: 100, warning: 500 }
              )}`}>
                <HardDrive className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Cache Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5 text-blue-600" />
              Cache Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Cache Size</p>
                  <p className="text-lg font-bold text-blue-700">
                    {systemOverview.cache.size} / {systemOverview.cache.maxSize}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Hit Rate</p>
                  <p className="text-lg font-bold text-green-700">{systemOverview.cache.hitRate}%</p>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Cache Utilization</span>
                  <span>{Math.round((systemOverview.cache.size / systemOverview.cache.maxSize) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${(systemOverview.cache.size / systemOverview.cache.maxSize) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slow Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5 text-red-600" />
              Slow Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemOverview.database.slowQueries.length > 0 ? (
                systemOverview.database.slowQueries.slice(0, 5).map((query, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-red-900">{query.query}</p>
                      <p className="text-xs text-red-600">{query.count} occurrences</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {Math.round(query.avgDuration)}ms
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-gray-500">No slow queries detected</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slow Endpoints */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="mr-2 h-5 w-5 text-orange-600" />
            Slow Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemOverview.endpoints.slowEndpoints.length > 0 ? (
              systemOverview.endpoints.slowEndpoints.slice(0, 6).map((endpoint, index) => (
                <div key={index} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-orange-900 truncate">{endpoint.endpoint}</p>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                      {Math.round(endpoint.avgDuration)}ms
                    </Badge>
                  </div>
                  <p className="text-xs text-orange-600">{endpoint.count} slow requests</p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <p className="text-gray-500">No slow endpoints detected</p>
                <p className="text-sm text-gray-400">All endpoints are performing well</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-purple-600" />
            Performance Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Cache recommendations */}
            {systemOverview.cache.hitRate < 80 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Low Cache Hit Rate</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Consider increasing cache TTL or reviewing cache invalidation strategies.
                      Current hit rate: {systemOverview.cache.hitRate}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Database recommendations */}
            {systemOverview.database.avgQueryTime > 500 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">Slow Database Queries</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Average query time is {systemOverview.database.avgQueryTime}ms. 
                      Consider adding database indexes or optimizing queries.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Memory recommendations */}
            {systemOverview.memory && systemOverview.memory.heapUsed > 500 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-900">High Memory Usage</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Memory usage is {systemOverview.memory.heapUsed}MB. 
                      Consider implementing memory optimization strategies.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Good performance message */}
            {systemOverview.cache.hitRate >= 80 && 
             systemOverview.database.avgQueryTime <= 500 && 
             (!systemOverview.memory || systemOverview.memory.heapUsed <= 500) && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Excellent Performance</h4>
                    <p className="text-sm text-green-700 mt-1">
                      All performance metrics are within optimal ranges. Keep up the good work!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}