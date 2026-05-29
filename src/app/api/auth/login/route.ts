import { NextResponse } from "next/server";
import {
  createDashboardSession,
  dashboardAuthCookieName,
  dashboardSessionMaxAge,
  getDashboardAuthConfig,
  getDashboardAuthConfigError,
  shouldUseSecureCookie,
} from "@/lib/dashboard-auth";

type LoginRequest = {
  username?: unknown;
  password?: unknown;
};

async function readBody(request: Request): Promise<LoginRequest> {
  try {
    const body = (await request.json()) as LoginRequest;

    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const configError = getDashboardAuthConfigError();

  if (configError) {
    return NextResponse.json({ ok: false, error: configError }, { status: 500 });
  }

  const config = getDashboardAuthConfig();
  const body = await readBody(request);
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (username !== config.username || password !== config.password) {
    return NextResponse.json(
      { ok: false, error: "用户名或密码错误" },
      { status: 401 },
    );
  }

  const session = await createDashboardSession(
    username,
    config.sessionSecret as string,
  );
  const response = NextResponse.json({ ok: true });

  response.cookies.set(dashboardAuthCookieName, session, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "lax",
    maxAge: dashboardSessionMaxAge,
    path: "/",
  });

  return response;
}
