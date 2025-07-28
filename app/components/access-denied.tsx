import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Shield, ArrowLeft, Home } from "lucide-react";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

export function AccessDenied({
  title = "Akses Ditolak",
  message = "Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.",
  showBackButton = true,
  showHomeButton = true
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-full shadow-lg">
                <Shield className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {title}
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-3">
              {showHomeButton && (
                <Link to="/">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                    <Home className="mr-2 h-4 w-4" />
                    Kembali ke Dashboard
                  </Button>
                </Link>
              )}
              {showBackButton && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali
                </Button>
              )}
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Butuh Akses?</h3>
              <p className="text-xs text-gray-600">
                Hubungi administrator sistem untuk meminta akses atau perubahan peran.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}