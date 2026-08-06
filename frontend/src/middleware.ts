import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authEntryPaths = ["/auth/login", "/auth/register"];

const authPathsAllowedWhenLoggedIn = [
  "/auth/verify-email",
  "/auth/check-email",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/accept-invite",
];

const protectedPrefixes = [
  "/dashboard",
  "/channels",
  "/posts",
  "/calendar",
  "/media",
  "/ai",
  "/plans",
  "/team",
  "/analytics",
  "/settings",
  "/invites",
  "/notifications",
  "/admin",
];

function isProtected(pathname: string) {
  return protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token");

  const isAuthEntry = authEntryPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const allowAuthWhenLoggedIn = authPathsAllowedWhenLoggedIn.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!token && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (token && isAuthEntry && !allowAuthWhenLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/channels/:path*",
    "/posts/:path*",
    "/calendar/:path*",
    "/media/:path*",
    "/ai/:path*",
    "/plans/:path*",
    "/team/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/invites/:path*",
    "/notifications/:path*",
    "/auth/:path*",
    "/admin/:path*",
  ],
};
