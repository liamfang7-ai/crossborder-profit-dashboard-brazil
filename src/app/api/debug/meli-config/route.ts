import { NextResponse } from "next/server";

const expectedRedirectUri =
  "https://crossborder-profit-dashboard-brazil.vercel.app/api/mercadolibre/callback";

export async function GET() {
  const clientId = process.env.MELI_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.MELI_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = process.env.MELI_REDIRECT_URI?.trim() ?? "";
  const site = process.env.MELI_SITE?.trim() ?? "MLB";

  return NextResponse.json({
    hasClientId: Boolean(clientId),
    clientIdLast4: clientId ? clientId.slice(-4) : "",
    hasClientSecret: Boolean(clientSecret),
    redirectUri,
    site,
    expectedRedirectUri,
    redirectUriMatchesExpected: redirectUri === expectedRedirectUri,
  });
}
