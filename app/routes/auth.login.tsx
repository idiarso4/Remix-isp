import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { authenticator, getUser } from "~/lib/auth.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Wifi, Mail, Lock, LogIn, AlertCircle, Shield } from "lucide-react";

export const meta: MetaFunction = () => {
  return [
    { title: "Login - ISP Management System" },
    { name: "description", content: "Login to ISP Management System" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // If user is already authenticated, redirect to dashboard
  const user = await getUser(request);
  if (user) {
    return redirect("/dashboard");
  }
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  console.log("Login attempt started");
  
  // Use authenticator's built-in redirect on success
  // Don't wrap in try-catch as redirects are thrown as responses
  return await authenticator.authenticate("user-pass", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/auth/login",
  });
}

export default function Login() {
  const actionData = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-lg">
              <Wifi className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
            ISP Management System
          </h1>
          <p className="text-gray-600">
            Masuk ke akun Anda untuk mengakses dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              Masuk ke Akun
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Gunakan email dan password untuk masuk
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              {/* Error Alert */}
              {actionData?.error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {actionData.error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@isp.com"
                    required
                    className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Memproses...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <LogIn className="mr-2 h-4 w-4" />
                    Masuk
                  </div>
                )}
              </Button>
            </Form>

            {/* Demo Credentials */}
            <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Shield className="h-4 w-4 mr-2 text-blue-600" />
                Demo Credentials:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2 bg-white rounded border">
                  <div className="font-medium text-red-600">Admin</div>
                  <div className="text-gray-600">admin@isp.com</div>
                  <div className="text-gray-500">admin123</div>
                </div>
                <div className="p-2 bg-white rounded border">
                  <div className="font-medium text-blue-600">Teknisi</div>
                  <div className="text-gray-600">tech1@isp.com</div>
                  <div className="text-gray-500">tech123</div>
                </div>
                <div className="p-2 bg-white rounded border">
                  <div className="font-medium text-green-600">Marketing</div>
                  <div className="text-gray-600">marketing@isp.com</div>
                  <div className="text-gray-500">marketing123</div>
                </div>
                <div className="p-2 bg-white rounded border">
                  <div className="font-medium text-purple-600">HR</div>
                  <div className="text-gray-600">hr@isp.com</div>
                  <div className="text-gray-500">hr123</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2024 ISP Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}