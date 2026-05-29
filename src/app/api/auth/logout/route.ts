import { NextResponse } from "next/server";
import {
  dashboardAuthCookieName,
  shouldUseSecureCookie,
} from "@/lib/dashboard-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(dashboardAuthCookieName, "", {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
