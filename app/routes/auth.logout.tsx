import type { ActionFunctionArgs } from "@remix-run/node";
import { logout } from "~/lib/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  return await logout(request);
}

export async function loader() {
  // If someone tries to access logout via GET, redirect to login
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/auth/login",
    },
  });
}