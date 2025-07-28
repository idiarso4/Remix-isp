import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { requireRouteAccess } from "~/lib/route-protection.server";
import { Navigation } from "~/components/navigation";
import { ErrorBoundary as AppErrorBoundary } from "~/components/error-boundary";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  
  // Check if user can access the current route
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Only check route access for specific protected routes
  if (pathname !== "/" && pathname !== "/auth/login" && pathname !== "/auth/logout") {
    requireRouteAccess(user, pathname);
  }
  
  return json({ user });
}

export function ErrorBoundary() {
  return <AppErrorBoundary />;
}

export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}