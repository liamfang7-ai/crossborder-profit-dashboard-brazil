import "server-only";

import { siteId } from "@/lib/market-config";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type MercadoLibreConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  site: string;
};

export type MercadoLibreConfigStatus = {
  clientId: boolean;
  clientSecret: boolean;
  redirectUri: boolean;
  site: string;
};

export type MercadoLibreTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number | string;
  scope?: string;
  token_type?: string;
};

export type MercadoLibreSavedToken = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  token_type: string | null;
  scope: string | null;
};

export type MercadoLibreConnectionStatus = {
  connected: boolean;
  userId: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
  error: string | null;
};

const authorizationUrl = "https://auth.mercadolivre.com.br/authorization";
const tokenUrl = "https://api.mercadolibre.com/oauth/token";

export function getMercadoLibreConfigStatus(): MercadoLibreConfigStatus {
  return {
    clientId: Boolean(process.env.MELI_CLIENT_ID),
    clientSecret: Boolean(process.env.MELI_CLIENT_SECRET),
    redirectUri: Boolean(process.env.MELI_REDIRECT_URI),
    site: siteId,
  };
}

export function getMercadoLibreConfig(): MercadoLibreConfig {
  return {
    clientId: process.env.MELI_CLIENT_ID || "",
    clientSecret: process.env.MELI_CLIENT_SECRET || "",
    redirectUri: process.env.MELI_REDIRECT_URI || "",
    site: siteId,
  };
}

export function buildMercadoLibreAuthUrl(state: string) {
  const config = getMercadoLibreConfig();
  const url = new URL(authorizationUrl);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

async function requestMercadoLibreToken(body: URLSearchParams) {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json();

  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : "Mercado Livre Brasil token request failed.";

    throw new Error(message);
  }

  return payload as MercadoLibreTokenResponse;
}

export async function exchangeMercadoLibreCode(code: string) {
  const config = getMercadoLibreConfig();

  return requestMercadoLibreToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  );
}

export async function saveMercadoLibreToken(token: MercadoLibreTokenResponse) {
  const admin = getSupabaseAdmin();
  const expiresAt = new Date(
    Date.now() + token.expires_in * 1000,
  ).toISOString();
  const { error } = await admin.from("mercadolibre_tokens").upsert(
    {
      user_id: String(token.user_id),
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_type: token.token_type ?? null,
      scope: token.scope ?? null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return {
    error: error?.message ?? null,
  };
}

export async function getLatestMercadoLibreToken(): Promise<{
  token: MercadoLibreSavedToken | null;
  error: string | null;
}> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("mercadolibre_tokens")
    .select(
      "user_id,access_token,refresh_token,expires_at,token_type,scope,updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      token: null,
      error: error.message,
    };
  }

  if (!data) {
    return {
      token: null,
      error: null,
    };
  }

  return {
    token: data as MercadoLibreSavedToken,
    error: null,
  };
}

export async function refreshMercadoLibreTokenIfNeeded(): Promise<{
  token: MercadoLibreSavedToken | null;
  error: string | null;
}> {
  const config = getMercadoLibreConfig();

  if (!config.clientId || !config.clientSecret) {
    return {
      token: null,
      error: "缺少 Mercado Libre Client ID 或 Client Secret，请检查 Vercel 环境变量。",
    };
  }

  const latest = await getLatestMercadoLibreToken();

  if (latest.error || !latest.token) {
    return latest;
  }

  const expiresAtMs = latest.token.expires_at
    ? new Date(latest.token.expires_at).getTime()
    : 0;
  const tenMinutes = 10 * 60 * 1000;

  if (expiresAtMs - Date.now() > tenMinutes) {
    return latest;
  }

  try {
    const refreshed = await requestMercadoLibreToken(
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: latest.token.refresh_token,
      }),
    );
    const saveResult = await saveMercadoLibreToken(refreshed);

    if (saveResult.error) {
      return {
        token: null,
        error: `刷新 token 成功但保存失败：${saveResult.error}`,
      };
    }

    return getLatestMercadoLibreToken();
  } catch {
    return {
      token: null,
      error: "Mercado Livre Brasil token 刷新失败，请重新授权或检查应用凭证。",
    };
  }
}

export async function getValidMercadoLibreAccessToken(): Promise<{
  accessToken: string | null;
  userId: string | null;
  error: string | null;
}> {
  const result = await refreshMercadoLibreTokenIfNeeded();

  return {
    accessToken: result.token?.access_token ?? null,
    userId: result.token?.user_id ?? null,
    error: result.error,
  };
}

export async function getMercadoLibreConnectionStatus(): Promise<MercadoLibreConnectionStatus> {
  try {
    const latest = await getLatestMercadoLibreToken();

    if (latest.error) {
      return {
        connected: false,
        userId: null,
        expiresAt: null,
        updatedAt: null,
        error: latest.error,
      };
    }

    return {
      connected: Boolean(latest.token?.user_id),
      userId: latest.token?.user_id ?? null,
      expiresAt: latest.token?.expires_at ?? null,
      updatedAt: null,
      error: null,
    };
  } catch (error) {
    return {
      connected: false,
      userId: null,
      expiresAt: null,
      updatedAt: null,
      error: error instanceof Error ? error.message : "读取连接状态失败。",
    };
  }
}
