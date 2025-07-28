import { createCookieSessionStorage } from "@remix-run/node";

// Create session storage
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session", // use any name you want here
    sameSite: "lax", // this helps with CSRF
    path: "/", // remember to add this so the cookie will work in all routes
    httpOnly: true, // for security reasons, make this cookie http only
    secrets: [process.env.SESSION_SECRET || "s3cr3t"], // replace this with an actual secret
    secure: process.env.NODE_ENV === "production", // enable this in prod only
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
});

// You can also export the methods individually for your own usage
export const { getSession, commitSession, destroySession } = sessionStorage;