import { NextRequest, NextResponse } from "next/server";
import {
  exchangeMercadoLibreCode,
  getMercadoLibreConfig,
  saveMercadoLibreToken,
} from "@/lib/mercadolibre";

function htmlPage(title: string, message: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Arial,'Microsoft YaHei',sans-serif;padding:32px;line-height:1.7;color:#0f172a"><h1>${title}</h1><p>${message}</p><p><a href="/mercadolibre">返回 Sonic 订单同步设置页</a></p></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = request.cookies.get("meli_oauth_state")?.value;

  if (!code) {
    return htmlPage("授权失败", "授权页面未返回 code。", 400);
  }

  if (!state || !savedState || state !== savedState) {
    return htmlPage("授权失败", "state 校验失败，请重新发起授权。", 400);
  }

  const config = getMercadoLibreConfig();

  if (!config.clientId || !config.redirectUri) {
    return htmlPage(
      "配置缺失",
      "缺少 MELI_CLIENT_ID 或 MELI_REDIRECT_URI，请先配置环境变量。",
      500,
    );
  }

  if (!config.clientSecret) {
    return htmlPage(
      "缺少 MELI_CLIENT_SECRET",
      "缺少 MELI_CLIENT_SECRET。OAuth 代码已准备好，请先在 Vercel 环境变量中配置店铺 Client Secret。",
      500,
    );
  }

  try {
    const token = await exchangeMercadoLibreCode(code);
    const result = await saveMercadoLibreToken(token);

    if (result.error) {
      return htmlPage(
        "Token 保存失败",
      `无法保存店铺授权 token：${result.error}。请确认 Supabase 已创建 mercadolibre_tokens 表和 RPC 函数。`,
        500,
      );
    }

    const response = htmlPage(
      "授权成功",
      `巴西店铺授权成功，已保存 user_id：${token.user_id}。`,
    );

    response.cookies.delete("meli_oauth_state");

    return response;
  } catch (error) {
    return htmlPage(
      "授权失败",
      error instanceof Error ? error.message : "店铺 OAuth 处理失败。",
      500,
    );
  }
}
