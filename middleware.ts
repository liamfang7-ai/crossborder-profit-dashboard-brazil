import { NextResponse, type NextRequest } from "next/server";
import {
  dashboardAuthCookieName,
  getDashboardAuthConfig,
  verifyDashboardSession,
} from "./src/lib/dashboard-auth";

const protectedPages = [
  "/",
  "/products",
  "/orders",
  "/mercadolibre",
  "/import",
  "/archive",
];

function isProtectedPage(pathname: string) {
  return protectedPages.some((path) => {
    if (path === "/") {
      return pathname === "/";
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  });
}

function isProtectedApi(pathname: string) {
  return (
    pathname === "/api/mercadolibre/sync-orders" ||
    pathname.startsWith("/api/mercadolibre/sync-orders/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const config = getDashboardAuthConfig();
  const authenticated = await verifyDashboardSession(
    request.cookies.get(dashboardAuthCookieName)?.value,
    config.sessionSecret,
  );

  if (pathname === "/login") {
    return authenticated
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (pathname === "/about") {
    return NextResponse.next();
  }

  if (!isProtectedPage(pathname) && !isProtectedApi(pathname)) {
    return NextResponse.next();
  }

  if (authenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/about",
    "/products/:path*",
    "/orders/:path*",
    "/mercadolibre/:path*",
    "/import/:path*",
    "/archive/:path*",
    "/api/mercadolibre/sync-orders/:path*",
  ],
};
