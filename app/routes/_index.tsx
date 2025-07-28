import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getUser } from "~/lib/auth.server";

export const meta: MetaFunction = () => {
  return [
    { title: "ISP Management System" },
    { name: "description", content: "Comprehensive ISP management platform" },
  ];
};

// Redirect authenticated users to dashboard, others to login
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getUser(request);
    console.log("Root loader - User:", user ? "authenticated" : "not authenticated");

    if (user) {
      console.log("Redirecting to dashboard");
      return redirect("/dashboard");
    }

    console.log("Redirecting to login");
    return redirect("/auth/login");
  } catch (error) {
    console.error("Error in root loader:", error);
    return redirect("/auth/login");
  }
}

export default function Index() {
  return null;
}