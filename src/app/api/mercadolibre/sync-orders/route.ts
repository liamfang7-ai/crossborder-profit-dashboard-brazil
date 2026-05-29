import { NextResponse } from "next/server";
import { getValidMercadoLibreAccessToken } from "@/lib/mercadolibre";
import { getMexicoDateRange } from "@/lib/mexico-time";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type SyncRequest = {
  days?: unknown;
};

type MeliOrderItem = {
  quantity?: number;
  unit_price?: number;
  item?: {
    id?: string;
    title?: string;
    seller_sku?: string;
    seller_custom_field?: string;
    picture_url?: string;
    thumbnail?: string;
    secure_thumbnail?: string;
    variation_id?: number | string;
  };
  variation_id?: number | string;
};

type MeliOrder = {
  id?: number | string;
  currency_id?: string;
  date_created?: string;
  date_closed?: string;
  paid_amount?: number;
  total_amount?: number;
  status?: string;
  order_items?: Array<MeliOrderItem>;
};

type MeliOrdersResponse = {
  results?: MeliOrder[];
};

type OrderPayload = {
  order_no: string;
  platform: string;
  country: string;
  currency: string;
  revenue: number;
  ordered_at: string;
  status?: string;
  raw_data?: MeliOrder;
  exchange_rate_mxn_to_cny: number;
  product_cost?: number;
  shipping_cost?: number;
  last_mile_fee?: number;
  platform_fee?: number;
  platform_tax?: number;
  ad_cost?: number;
  refund_amount?: number;
  other_fee?: number;
};

type OrderItemPayload = {
  sync_key: string;
  order_no: string;
  platform: string;
  country: string;
  currency: string;
  sku: string;
  product_name: string;
  image_url: string | null;
  quantity: number;
  unit_price_mxn: number;
  total_price_mxn: number;
  ordered_at: string;
  meli_item_id: string;
  variation_id: string;
  raw_data: MeliOrderItem;
};

const recentOrdersUrl = "https://api.mercadolibre.com/orders/search/recent";
const searchOrdersUrl = "https://api.mercadolibre.com/orders/search";

function parseNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeDays(value: unknown) {
  return Math.max(1, Math.min(90, Math.floor(parseNumber(value, 7))));
}

async function readRequestBody(request: Request): Promise<SyncRequest> {
  try {
    const body = (await request.json()) as SyncRequest;

    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function getOrderRevenue(order: MeliOrder) {
  if (typeof order.paid_amount === "number") {
    return order.paid_amount;
  }

  if (typeof order.total_amount === "number") {
    return order.total_amount;
  }

  return (order.order_items ?? []).reduce((total, item) => {
    const unitPrice = item.unit_price ?? 0;
    const quantity = item.quantity ?? 0;

    return total + unitPrice * quantity;
  }, 0);
}

function mapMeliOrder(order: MeliOrder): OrderPayload | null {
  if (!order.id) {
    return null;
  }

  const revenue = getOrderRevenue(order);
  const orderedAt =
    order.date_created || order.date_closed || new Date().toISOString();

  return {
    order_no: `MLM-${order.id}`,
    platform: "Mercado Libre MX",
    country: "MX",
    currency: order.currency_id || "MXN",
    revenue,
    ordered_at: new Date(orderedAt).toISOString(),
    status: order.status || "unknown",
    raw_data: order,
    exchange_rate_mxn_to_cny: 0.42,
    product_cost: 0,
    shipping_cost: 0,
    last_mile_fee: 0,
    platform_fee: 0,
    platform_tax: 0,
    ad_cost: 0,
    refund_amount: 0,
    other_fee: 0,
  };
}

function getOrderNo(order: MeliOrder) {
  return order.id ? `MLM-${order.id}` : "";
}

function getOrderedAt(order: MeliOrder) {
  const orderedAt =
    order.date_created || order.date_closed || new Date().toISOString();

  return new Date(orderedAt).toISOString();
}

function getItemSku(item: MeliOrderItem) {
  return (
    item.item?.seller_sku ||
    item.item?.seller_custom_field ||
    item.item?.id ||
    "UNMAPPED"
  );
}

function mapMeliOrderItems(order: MeliOrder): OrderItemPayload[] {
  const orderNo = getOrderNo(order);

  if (!orderNo) {
    return [];
  }

  const orderedAt = getOrderedAt(order);

  return (order.order_items ?? []).map((orderItem, index) => {
    const sku = getItemSku(orderItem);
    const meliItemId = orderItem.item?.id || sku || `line-${index + 1}`;
    const variationId = String(
      orderItem.variation_id ?? orderItem.item?.variation_id ?? "no-variation",
    );
    const quantity = parseNumber(orderItem.quantity, 0);
    const unitPrice = parseNumber(orderItem.unit_price, 0);
    const productName = orderItem.item?.title || sku;

    return {
      sync_key: `${orderNo}:${meliItemId}:${variationId}`,
      order_no: orderNo,
      platform: "Mercado Libre MX",
      country: "MX",
      currency: order.currency_id || "MXN",
      sku,
      product_name: productName,
      image_url:
        orderItem.item?.picture_url ||
        orderItem.item?.thumbnail ||
        orderItem.item?.secure_thumbnail ||
        null,
      quantity,
      unit_price_mxn: unitPrice,
      total_price_mxn: unitPrice * quantity,
      ordered_at: orderedAt,
      meli_item_id: meliItemId,
      variation_id: variationId,
      raw_data: orderItem,
    };
  });
}

async function fetchMeliOrders(
  accessToken: string,
  userId: string,
  pageSize: number,
  maxPages: number,
) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };
  const buildUrl = (base: string, offset: number) => {
    const url = new URL(base);

    url.searchParams.set("seller", userId);
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("sort", "date_desc");
    url.searchParams.set("limit", String(pageSize));

    return url;
  };
  const warnings: string[] = [];
  const orders: MeliOrder[] = [];
  let pages = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize;
    let response = await fetch(buildUrl(recentOrdersUrl, offset), { headers });

    if (!response.ok) {
      if (page === 0) {
        warnings.push("recent 接口不可用，已使用 orders/search 兜底。");
      }

      response = await fetch(buildUrl(searchOrdersUrl, offset), { headers });
    }

    if (!response.ok) {
      warnings.push("Mercado Libre 订单接口请求失败。");
      break;
    }

    const pageOrders =
      ((await response.json()) as MeliOrdersResponse).results ?? [];

    pages += 1;
    orders.push(...pageOrders);

    if (pageOrders.length < pageSize) {
      break;
    }
  }

  return {
    orders,
    pages,
    warnings,
  };
}

async function getExistingOrderNos(orderNos: string[]) {
  if (orderNos.length === 0) {
    return new Set<string>();
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("orders")
    .select("order_no")
    .in("order_no", orderNos);

  if (error) {
    throw new Error("读取现有订单失败。");
  }

  return new Set((data ?? []).map((row) => row.order_no as string));
}

function reliablePayload(payload: OrderPayload) {
  return {
    order_no: payload.order_no,
    platform: payload.platform,
    country: payload.country,
    currency: payload.currency,
    revenue: payload.revenue,
    ordered_at: payload.ordered_at,
    status: payload.status,
    raw_data: payload.raw_data,
    exchange_rate_mxn_to_cny: payload.exchange_rate_mxn_to_cny,
  };
}

function insertPayload(payload: OrderPayload) {
  return payload;
}

async function writeOrders(payloads: OrderPayload[]) {
  const admin = getSupabaseAdmin();
  const warnings: string[] = [];
  const existing = await getExistingOrderNos(payloads.map((item) => item.order_no));
  const newPayloads = payloads.filter((item) => !existing.has(item.order_no));
  const existingPayloads = payloads
    .filter((item) => existing.has(item.order_no))
    .map(reliablePayload);

  async function mutate(rows: Array<Record<string, unknown>>, mode: "upsert" | "update") {
    if (rows.length === 0) {
      return null;
    }

    const result =
      mode === "upsert"
        ? await admin.from("orders").upsert(rows, { onConflict: "order_no" })
        : await admin.from("orders").upsert(rows, { onConflict: "order_no" });

    if (!result.error) {
      return null;
    }

    const message = result.error.message;

    if (message.includes("raw_data") || message.includes("status")) {
      warnings.push(
        "orders 表可能缺少 status 或 raw_data 字段，已跳过这些字段继续同步。",
      );
      const safeRows = rows.map((row) => {
        const safeRow = { ...row };

        delete safeRow.raw_data;
        delete safeRow.status;

        return safeRow;
      });
      const retry = await admin
        .from("orders")
        .upsert(safeRows, { onConflict: "order_no" });

      return retry.error;
    }

    return result.error;
  }

  const insertError = await mutate(newPayloads.map(insertPayload), "upsert");

  if (insertError) {
    throw new Error("写入新订单失败。");
  }

  const updateError = await mutate(existingPayloads, "update");

  if (updateError) {
    throw new Error("更新已有订单失败。");
  }

  return {
    synced: newPayloads.length + existingPayloads.length,
    warnings,
  };
}

async function writeOrderItems(payloads: OrderItemPayload[]) {
  if (payloads.length === 0) {
    return {
      synced: 0,
      warnings: [] as string[],
    };
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("order_items")
    .upsert(payloads, { onConflict: "sync_key" });

  if (error) {
    throw new Error("写入订单商品明细失败。");
  }

  return {
    synced: payloads.length,
    warnings: [] as string[],
  };
}

export async function POST(request: Request) {
  try {
    const body = await readRequestBody(request);
    const days = normalizeDays(body.days);
    const pageSize = 50;
    const maxPages = days <= 1 ? 20 : 40;
    const token = await getValidMercadoLibreAccessToken();

    if (token.error || !token.accessToken || !token.userId) {
      return NextResponse.json(
        { ok: false, error: token.error ?? "Mercado Libre 尚未连接。" },
        { status: 400 },
      );
    }

    const fetched = await fetchMeliOrders(
      token.accessToken,
      token.userId,
      pageSize,
      maxPages,
    );

    if (fetched.orders.length === 0 && fetched.warnings.length > 0) {
      return NextResponse.json(
        { ok: false, error: fetched.warnings[0] },
        { status: 502 },
      );
    }

    const range =
      days <= 1
        ? getMexicoDateRange("today", "", "")
        : getMexicoDateRange("7d", "", "");
    const startTime = range.start.getTime();
    const endTime = range.end.getTime();
    const inRange = (order: MeliOrder) => {
      const orderDate = order.date_created || order.date_closed;

      if (!orderDate) {
        return true;
      }

      const time = new Date(orderDate).getTime();

      return time >= startTime && time <= endTime;
    };
    const mapped = fetched.orders
      .filter(inRange)
      .map(mapMeliOrder)
      .filter((order): order is OrderPayload => Boolean(order));
    const writeResult = await writeOrders(mapped);
    const itemPayloads = fetched.orders
      .filter(inRange)
      .flatMap(mapMeliOrderItems);
    const itemWriteResult = await writeOrderItems(itemPayloads);
    const skipped = fetched.orders.length - mapped.length;

    return NextResponse.json({
      ok: true,
      sellerId: token.userId,
      fetched: fetched.orders.length,
      synced: writeResult.synced,
      itemsSynced: itemWriteResult.synced,
      pages: fetched.pages,
      skipped,
      warnings: [
        ...new Set([
          ...fetched.warnings,
          ...writeResult.warnings,
          ...itemWriteResult.warnings,
        ]),
      ],
      message: "同步完成",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "订单同步失败。",
      },
      { status: 500 },
    );
  }
}
