import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import {
  Settings,
  User,
  Shield,
  Bell,
  Palette,
  Database,
  HelpCircle,
  ExternalLink,
  ChevronRight
} from "lucide-react";

export const meta: MetaFunction = () => {
  return [
    { title: "Pengaturan - ISP Management System" },
    { name: "description", content: "Pengaturan sistem dan preferensi pengguna" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  return json({ user });
}

const settingsCategories = [
  {
    title: "Profil & Akun",
    description: "Kelola informasi profil dan keamanan akun",
    icon: User,
    href: "/profile",
    color: "bg-blue-500",
    items: [
      "Edit profil pengguna",
      "Ubah password",
      "Informasi akun"
    ]
  },
  {
    title: "Keamanan",
    description: "Pengaturan keamanan dan privasi",
    icon: Shield,
    href: "#",
    color: "bg-red-500",
    items: [
      "Riwayat login",
      "Sesi aktif",
      "Pengaturan privasi"
    ],
    disabled: true
  },
  {
    title: "Notifikasi",
    description: "Atur preferensi notifikasi",
    icon: Bell,
    href: "#",
    color: "bg-yellow-500",
    items: [
      "Email notifications",
      "Push notifications",
      "Alert preferences"
    ],
    disabled: true
  },
  {
    title: "Tampilan",
    description: "Kustomisasi tampilan aplikasi",
    icon: Palette,
    href: "#",
    color: "bg-purple-500",
    items: [
      "Theme preferences",
      "Language settings",
      "Layout options"
    ],
    disabled: true
  },
  {
    title: "Data & Backup",
    description: "Kelola data dan backup",
    icon: Database,
    href: "#",
    color: "bg-green-500",
    items: [
      "Export data",
      "Backup settings",
      "Data retention"
    ],
    disabled: true
  },
  {
    title: "Bantuan & Support",
    description: "Dokumentasi dan dukungan teknis",
    icon: HelpCircle,
    href: "#",
    color: "bg-indigo-500",
    items: [
      "User guide",
      "FAQ",
      "Contact support"
    ],
    disabled: true
  }
];

export default function Settings() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Pengaturan"
        description="Kelola pengaturan sistem dan preferensi pengguna"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCategories.map((category) => {
          const Icon = category.icon;
          
          return (
            <Card 
              key={category.title} 
              className={`bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 ${
                category.disabled ? 'opacity-60' : 'hover:-translate-y-1'
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 ${category.color} rounded-xl`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  {category.disabled && (
                    <Badge variant="secondary" className="text-xs">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{category.title}</CardTitle>
                <p className="text-sm text-gray-600">{category.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {category.items.map((item, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3"></div>
                      {item}
                    </li>
                  ))}
                </ul>
                
                <div className="pt-2">
                  {category.disabled ? (
                    <Button variant="outline" className="w-full" disabled>
                      <Settings className="mr-2 h-4 w-4" />
                      Segera Hadir
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link to={category.href}>
                        <Settings className="mr-2 h-4 w-4" />
                        Buka Pengaturan
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Information */}
      <div className="mt-12">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Informasi Sistem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">Versi Aplikasi</h3>
                <p className="text-2xl font-bold text-blue-600 mt-2">v1.0.0</p>
                <p className="text-sm text-gray-500 mt-1">Stable Release</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">Status Sistem</h3>
                <div className="flex items-center justify-center mt-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-lg font-semibold text-green-600">Online</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">All systems operational</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">Role Anda</h3>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {user.employee?.role || 'USER'}
                </p>
                <p className="text-sm text-gray-500 mt-1">{user.employee?.division || 'No Division'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="mt-8">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" asChild className="justify-start h-auto p-4">
                <Link to="/profile">
                  <User className="mr-3 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Edit Profil</div>
                    <div className="text-sm text-gray-500">Update informasi personal</div>
                  </div>
                </Link>
              </Button>
              
              <Button variant="outline" className="justify-start h-auto p-4" disabled>
                <HelpCircle className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Bantuan & Dokumentasi</div>
                  <div className="text-sm text-gray-500">Panduan penggunaan sistem</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}