import { NextResponse } from "next/server";
import { getMexicoRetentionCutoff } from "@/lib/mexico-time";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || !authorization?.startsWith("Bearer ")) {
    return false;
  }

  return authorization.slice("Bearer ".length) === cronSecret;
}

async function cleanup(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = getMexicoRetentionCutoff(90).toISOString();
    const admin = getSupabaseAdmin();
    const { data: deletedItems, error: itemsError } = await admin
      .from("order_items")
      .delete()
      .lt("ordered_at", cutoff)
      .select("sync_key");

    if (itemsError) {
      throw new Error("删除 90 天前 SKU 明细失败。");
    }

    const { data: deletedOrders, error: ordersError } = await admin
      .from("orders")
      .delete()
      .lt("ordered_at", cutoff)
      .select("order_no");

    if (ordersError) {
      throw new Error("删除 90 天前订单失败。");
    }

    return NextResponse.json({
      ok: true,
      deletedOrders: deletedOrders?.length ?? 0,
      deletedOrderItems: deletedItems?.length ?? 0,
      cutoff,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "清理旧订单失败。",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return cleanup(request);
}

export async function POST(request: Request) {
  return cleanup(request);
}
