import { NextResponse } from "next/server";
import {
  buildMercadoLibreAuthUrl,
  getMercadoLibreConfig,
} from "@/lib/mercadolibre";

export async function GET() {
  const config = getMercadoLibreConfig();
  const missing = [
    !config.clientId ? "MELI_CLIENT_ID" : null,
    !config.redirectUri ? "MELI_REDIRECT_URI" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `缺少环境变量：${missing.join(", ")}`,
      },
      { status: 500 },
    );
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildMercadoLibreAuthUrl(state));

  response.cookies.set("meli_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 10 * 60,
    path: "/",
  });

  return response;
}
