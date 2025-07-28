import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { sessionStorage } from "./session.server";
import { db } from "./db.server";
import bcrypt from "bcryptjs";

export interface User {
  id: string;
  email: string;
  employee?: {
    id: string;
    name: string;
    role: string;
    position: string;
    division: string;
    canHandleTickets: boolean;
  };
}

// Create an instance of the authenticator
export const authenticator = new Authenticator<User>(sessionStorage);

// Configure the form strategy
authenticator.use(
  new FormStrategy(async ({ form }) => {
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    // Validate the inputs
    if (!email || !password) {
      throw new Error("Email dan password harus diisi");
    }

    // Find user in database
    const user = await db.user.findUnique({
      where: { email },
      include: {
        employee: true,
      },
    });

    if (!user) {
      throw new Error("Email atau password salah");
    }

    // Check if user has a password hash
    if (!user.passwordHash) {
      throw new Error("Akun belum diaktivasi");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Email atau password salah");
    }

    // Check if user has employee record
    if (!user.employee) {
      throw new Error("Akun tidak memiliki data karyawan");
    }

    // Return user object
    return {
      id: user.id,
      email: user.email,
      employee: {
        id: user.employee.id,
        name: user.employee.name,
        role: user.employee.role,
        position: user.employee.position || "",
        division: user.employee.division || "",
        canHandleTickets: user.employee.canHandleTickets,
      },
    };
  }),
  "user-pass"
);

// Helper function to require authentication
export async function requireAuth(request: Request) {
  return await authenticator.isAuthenticated(request, {
    failureRedirect: "/auth/login",
  });
}

// Helper function to get current user (optional)
export async function getUser(request: Request) {
  return await authenticator.isAuthenticated(request);
}

// Helper function to check if user is authenticated
export async function isAuthenticated(request: Request) {
  const user = await authenticator.isAuthenticated(request);
  return !!user;
}

// Helper function to check if user has specific role
export function hasRole(user: User, roles: string | string[]): boolean {
  if (!user.employee) return false;
  
  const userRole = user.employee.role;
  if (typeof roles === "string") {
    return userRole === roles;
  }
  
  return roles.includes(userRole);
}

// Helper function to check if user can handle tickets
export function canHandleTickets(user: User): boolean {
  return user.employee?.canHandleTickets || false;
}

// Helper function to logout user
export async function logout(request: Request) {
  return await authenticator.logout(request, { redirectTo: "/auth/login" });
}