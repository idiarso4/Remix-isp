import { useRouteError, isRouteErrorResponse, Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertTriangle, Home, RefreshCw, Shield } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 403) {
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
                  Akses Ditolak
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  Anda tidak memiliki izin untuk mengakses halaman ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-700">
                    {error.statusText || "Forbidden"}
                  </p>
                </div>
                
                <div className="flex flex-col space-y-3">
                  <Link to="/">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                      <Home className="mr-2 h-4 w-4" />
                      Kembali ke Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.history.back()}
                  >
                    Kembali
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (error.status === 404) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full shadow-lg">
                    <AlertTriangle className="h-12 w-12 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Halaman Tidak Ditemukan
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  Halaman yang Anda cari tidak dapat ditemukan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                    <Home className="mr-2 h-4 w-4" />
                    Kembali ke Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Other HTTP errors
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-full shadow-lg">
                  <AlertTriangle className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Error {error.status}
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                {error.statusText || "Terjadi kesalahan"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-700">
                  {error.data || "Terjadi kesalahan yang tidak diketahui"}
                </p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Muat Ulang
                </Button>
                <Link to="/">
                  <Button variant="outline" className="w-full">
                    <Home className="mr-2 h-4 w-4" />
                    Kembali ke Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // JavaScript errors
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-full shadow-lg">
                <AlertTriangle className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Terjadi Kesalahan
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Aplikasi mengalami kesalahan yang tidak terduga.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
            
            <div className="flex flex-col space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Muat Ulang
              </Button>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Kembali ke Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}