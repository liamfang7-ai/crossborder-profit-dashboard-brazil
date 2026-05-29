export const dashboardAuthCookieName = "dashboard_auth";
export const dashboardSessionMaxAge = 60 * 60 * 12;

export function shouldUseSecureCookie() {
  return process.env.NODE_ENV === "production";
}

type SessionPayload = {
  username: string;
  expiresAt: number;
};

function base64UrlEncode(value: string) {
  if (typeof btoa === "function") {
    return btoa(value)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  if (typeof atob === "function") {
    return atob(padded);
  }

  return Buffer.from(padded, "base64").toString("utf8");
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));

  return base64UrlEncode(binary);
}

function getCrypto() {
  return globalThis.crypto;
}

async function signPayload(payload: string, secret: string) {
  const crypto = getCrypto();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return bytesToBase64Url(signature);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

export function getDashboardAuthConfig() {
  return {
    username: process.env.DASHBOARD_USERNAME,
    password: process.env.DASHBOARD_PASSWORD,
    sessionSecret: process.env.DASHBOARD_SESSION_SECRET,
  };
}

export function getDashboardAuthConfigError() {
  const config = getDashboardAuthConfig();

  if (!config.username || !config.password || !config.sessionSecret) {
    return "登录配置缺失，请在 Vercel 环境变量中配置 DASHBOARD_USERNAME、DASHBOARD_PASSWORD、DASHBOARD_SESSION_SECRET。";
  }

  return "";
}

export async function createDashboardSession(username: string, secret: string) {
  const payload: SessionPayload = {
    username,
    expiresAt: Date.now() + dashboardSessionMaxAge * 1000,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export async function verifyDashboardSession(
  cookieValue: string | undefined,
  secret: string | undefined,
) {
  if (!cookieValue || !secret) {
    return false;
  }

  const [encodedPayload, signature] = cookieValue.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = await signPayload(encodedPayload, secret);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    return Boolean(payload.username && payload.expiresAt > Date.now());
  } catch {
    return false;
  }
}
