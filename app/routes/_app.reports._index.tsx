import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import { requirePermission } from "~/lib/route-protection.server";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { FinancialReport } from "~/components/reports/financial-report";
import { TicketAnalyticsReport } from "~/components/reports/ticket-analytics-report";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { 
  BarChart3, 
  DollarSign, 
  Ticket, 
  Users,
  Calendar,
  Download,
  Filter
} from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  requirePermission(user, "reports", "read");

  return json({ user });
}

export default function ReportsPage() {
  const { user } = useLoaderData<typeof loader>();
  const [period, setPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("financial");

  const handleExportReport = () => {
    // This would trigger a report export
    console.log("Exporting report...");
  };

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive business intelligence and performance analytics"
      >
        <div className="flex items-center space-x-3">
          {/* Period Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="year">This Year</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>

          <Button
            variant="outline"
            onClick={handleExportReport}
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </PageHeader>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial" className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Financial</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center space-x-2">
            <Ticket className="h-4 w-4" />
            <span>Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Employees</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Customers</span>
          </TabsTrigger>
        </TabsList>

        {/* Financial Report */}
        <TabsContent value="financial" className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold">Financial Analytics</h3>
            <Badge variant="outline" className="text-xs">
              Period: {period === "all" ? "All Time" : period === "year" ? "This Year" : period === "month" ? "This Month" : "This Week"}
            </Badge>
          </div>
          <FinancialReport period={period} />
        </TabsContent>

        {/* Ticket Analytics */}
        <TabsContent value="tickets" className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <Ticket className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Ticket Analytics</h3>
            <Badge variant="outline" className="text-xs">
              Period: {period === "all" ? "All Time" : period === "year" ? "This Year" : period === "month" ? "This Month" : "This Week"}
            </Badge>
          </div>
          <TicketAnalyticsReport period={period} />
        </TabsContent>

        {/* Employee Performance */}
        <TabsContent value="employees" className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold">Employee Performance</h3>
            <Badge variant="outline" className="text-xs">
              Period: {period === "all" ? "All Time" : period === "year" ? "This Year" : period === "month" ? "This Month" : "This Week"}
            </Badge>
          </div>
          
          <div className="bg-white rounded-lg border p-6">
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Employee Performance Report
              </h3>
              <p className="text-gray-600 mb-4">
                Detailed employee performance analytics coming soon.
              </p>
              <Button variant="outline">
                View Employee Dashboard
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Customer Analytics */}
        <TabsContent value="customers" className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Customer Analytics</h3>
            <Badge variant="outline" className="text-xs">
              Period: {period === "all" ? "All Time" : period === "year" ? "This Year" : period === "month" ? "This Month" : "This Week"}
            </Badge>
          </div>
          
          <div className="bg-white rounded-lg border p-6">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Customer Analytics Report
              </h3>
              <p className="text-gray-600 mb-4">
                Customer behavior and satisfaction analytics coming soon.
              </p>
              <Button variant="outline">
                View Customer Dashboard
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}