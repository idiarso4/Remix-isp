import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { StatsCard, iconVariants } from "~/components/ui/stats-card";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { 
  Users, 
  Package, 
  Ticket, 
  UserCheck, 
  BarChart3, 
  Activity,
  Shield,
  Zap,
  TrendingUp
} from "lucide-react";

export const meta: MetaFunction = () => {
  return [
    { title: "Dashboard - ISP Management System" },
    { name: "description", content: "Dashboard ISP Management System" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  return json({});
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <PageContainer className="py-8">
        <PageHeader
          title="Selamat Datang di Dashboard"
          description="Kelola operasional ISP Anda dengan mudah dan efisien"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Pelanggan"
            value={1234}
            icon={Users}
            iconClassName={iconVariants.green}
            trend={{ value: "+12% bulan ini", isPositive: true }}
          />
          
          <StatsCard
            title="Tiket Aktif"
            value={89}
            icon={Ticket}
            iconClassName={iconVariants.orange}
            description="23 prioritas tinggi"
          />
          
          <StatsCard
            title="Teknisi Aktif"
            value={12}
            icon={UserCheck}
            iconClassName={iconVariants.blue}
            description="8 tersedia"
          />
          
          <StatsCard
            title="Pendapatan"
            value="$45.2K"
            icon={BarChart3}
            iconClassName={iconVariants.purple}
            trend={{ value: "+8% dari target", isPositive: true }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">Aktif</Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                Manajemen Pelanggan
              </CardTitle>
              <CardDescription className="text-gray-600">
                Kelola pelanggan WiFi, lacak status, dan tangani penagihan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/customers">
                <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                  <Users className="mr-2 h-4 w-4" />
                  Lihat Pelanggan
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">4 Paket</Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                Paket Internet
              </CardTitle>
              <CardDescription className="text-gray-600">
                Buat dan kelola paket layanan internet dengan penetapan harga yang fleksibel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/packages">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white">
                  <Package className="mr-2 h-4 w-4" />
                  Kelola Paket
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Ticket className="h-6 w-6 text-white" />
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">89 Aktif</Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                Tiket Support
              </CardTitle>
              <CardDescription className="text-gray-600">
                Tangani masalah pelanggan dan lacak resolusi dengan sistem ticketing terintegrasi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/tickets">
                <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                  <Ticket className="mr-2 h-4 w-4" />
                  Lihat Tiket
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 p-8 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-3xl border border-green-200/50 backdrop-blur-sm">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg mr-3">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Status Pengembangan
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center p-4 bg-white/60 rounded-xl border border-white/30">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-gray-700 font-medium">Foundation & UI</span>
            </div>
            <div className="flex items-center p-4 bg-white/60 rounded-xl border border-white/30">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-gray-700 font-medium">Database Setup</span>
            </div>
            <div className="flex items-center p-4 bg-white/60 rounded-xl border border-white/30">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-gray-700 font-medium">Authentication</span>
            </div>
            <div className="flex items-center p-4 bg-white/60 rounded-xl border border-white/30">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-gray-700 font-medium">Core UI Components</span>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}