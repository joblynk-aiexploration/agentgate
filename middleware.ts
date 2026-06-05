import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "agentgate_session";

const protectedPrefixes = [
  "/agents",
  "/approvals",
  "/audit-logs",
  "/billing",
  "/dashboard",
  "/developer",
  "/integrations",
  "/policies",
  "/reports",
  "/settings",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/agents/:path*",
    "/approvals/:path*",
    "/audit-logs/:path*",
    "/billing/:path*",
    "/dashboard/:path*",
    "/developer/:path*",
    "/integrations/:path*",
    "/policies/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
