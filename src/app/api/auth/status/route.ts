import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  dashboardAuthCookieName,
  getDashboardAuthConfig,
  verifyDashboardSession,
} from "@/lib/dashboard-auth";

export async function GET() {
  const cookieStore = await cookies();
  const config = getDashboardAuthConfig();
  const authenticated = await verifyDashboardSession(
    cookieStore.get(dashboardAuthCookieName)?.value,
    config.sessionSecret,
  );

  return NextResponse.json({ authenticated });
}
