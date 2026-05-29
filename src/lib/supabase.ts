import { createClient } from "@supabase/supabase-js";
import { calculateProfit } from "./profit";
import { safeFormula } from "./safe-formula";

export type OrderRow = {
  order_no: string;
  platform: string;
  country: string;
  currency: string;
  status: string | null;
  revenue: number | null;
  product_cost: number | null;
  shipping_cost: number | null;
  last_mile_fee: number | null;
  platform_fee: number | null;
  platform_tax: number | null;
  ad_cost: number | null;
  refund_amount: number | null;
  other_fee: number | null;
  exchange_rate_to_usd: number | null;
  exchange_rate_mxn_to_cny: number | null;
  ordered_at: string;
};

export type DashboardOrder = {
  orderNo: string;
  platform: string;
  country: string;
  currency: string;
  status: string;
  revenue: number;
  productCost: number;
  shippingCost: number;
  lastMileFee: number;
  platformFee: number;
  platformTax: number;
  adCost: number;
  refundAmount: number;
  otherFee: number;
  exchangeRateToUsd: number;
  exchangeRateMxnToCny: number;
  orderedAt: string;
  profit: number;
  profitMargin: number;
};

export type OrdersRangeQuery = {
  start: string;
  end: string;
  platform?: string;
};

export type OrdersRangeResult = {
  orders: DashboardOrder[];
  error: string | null;
  hitLimit: boolean;
};

export type OrderDetailRow = {
  orderNo: string;
  orderedAt: string;
  status: string;
  sku: string;
  productName: string;
  quantity: number;
  salesMxn: number;
  salesCny: number;
  exchangeRate: number;
  platform: string;
};

export type OrderDetailsResult = {
  rows: OrderDetailRow[];
  total: number;
  error: string | null;
  hitLimit: boolean;
};

export type ProductRow = {
  sku: string;
  product_name: string | null;
  image_url: string | null;
  unit_cost_cny: number | null;
  unit_shipping_cost_cny: number | null;
  is_active: boolean | null;
  platform_fee_formula_mxn: string | null;
  platform_tax_formula_mxn: string | null;
  last_mile_fee_formula_mxn: string | null;
  ad_cost_formula_mxn: string | null;
  other_fee_formula_mxn: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OrderItemRow = {
  sync_key: string;
  order_no: string;
  platform: string;
  country: string;
  currency: string;
  sku: string;
  product_name: string | null;
  image_url: string | null;
  quantity: number | null;
  unit_price_mxn: number | null;
  total_price_mxn: number | null;
  ordered_at: string;
  meli_item_id: string | null;
  variation_id: string | null;
  raw_data?: unknown;
};

export type SkuSummary = {
  sku: string;
  productName: string;
  imageUrl: string | null;
  orderCount: number;
  quantity: number;
  salesMxn: number;
  salesCny: number;
  productCostCny: number;
  shippingCostCny: number;
  platformFeeMxn: number;
  platformTaxMxn: number;
  lastMileFeeMxn: number;
  adCostMxn: number;
  otherFeeMxn: number;
  feesTotalMxn: number;
  feesTotalCny: number;
  profitCny: number;
  profitMargin: number;
  costConfigured: boolean;
  formulaErrors: string[];
};

export type SkuDashboardResult = {
  skuSummaries: SkuSummary[];
  recentOrders: DashboardOrder[];
  orderCount: number;
  exchangeRate: number;
  error: string | null;
  hitLimit: boolean;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function toNumber(value: number | null | undefined) {
  return value ?? 0;
}

function formatOrderedAt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function mapOrderRowToDashboardOrder(row: OrderRow): DashboardOrder {
  const order = {
    revenue: toNumber(row.revenue),
    productCost: toNumber(row.product_cost),
    shippingCost: toNumber(row.shipping_cost),
    lastMileFee: toNumber(row.last_mile_fee),
    platformFee: toNumber(row.platform_fee),
    platformTax: toNumber(row.platform_tax),
    adCost: toNumber(row.ad_cost),
    refundAmount: toNumber(row.refund_amount),
    otherFee: toNumber(row.other_fee),
    exchangeRateMxnToCny: row.exchange_rate_mxn_to_cny ?? 0.42,
  };

  return {
    orderNo: row.order_no,
    platform: row.platform,
    country: row.country,
    currency: row.currency,
    status: row.status ?? "unknown",
    exchangeRateToUsd: row.exchange_rate_to_usd ?? 1,
    orderedAt: formatOrderedAt(row.ordered_at),
    ...order,
    ...calculateProfit(order),
  };
}

export async function getRecentOrdersResult(): Promise<{
  orders: DashboardOrder[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      [
        "order_no",
        "platform",
        "country",
        "currency",
        "status",
        "revenue",
        "product_cost",
        "shipping_cost",
        "last_mile_fee",
        "platform_fee",
        "platform_tax",
        "ad_cost",
        "refund_amount",
        "other_fee",
        "exchange_rate_to_usd",
        "exchange_rate_mxn_to_cny",
        "ordered_at",
      ].join(","),
    )
    .order("ordered_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Failed to fetch Supabase orders:", error.message);
    return {
      orders: [],
      error: error.message,
    };
  }

  return {
    orders: ((data ?? []) as unknown as OrderRow[]).map((row) =>
      mapOrderRowToDashboardOrder(row),
    ),
    error: null,
  };
}

export async function getRecentOrders(): Promise<DashboardOrder[]> {
  const { orders } = await getRecentOrdersResult();

  return orders;
}

export async function getOrdersByDateRangeResult({
  start,
  end,
  platform,
}: OrdersRangeQuery): Promise<OrdersRangeResult> {
  const pageSize = 1000;
  const maxRows = 10000;
  const rows: OrderRow[] = [];

  // Supabase/PostgREST caps each response, so read in 1000-row pages.
  // The dashboard is intended for about 9000 retained orders; stop at 10000
  // and ask the user to narrow the date range if the result is larger.
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = from + pageSize - 1;
    let query = supabase
      .from("orders")
      .select(
        [
          "order_no",
          "platform",
          "country",
          "currency",
          "status",
          "revenue",
          "product_cost",
          "shipping_cost",
          "last_mile_fee",
          "platform_fee",
          "platform_tax",
          "ad_cost",
          "refund_amount",
          "other_fee",
          "exchange_rate_to_usd",
          "exchange_rate_mxn_to_cny",
          "ordered_at",
        ].join(","),
      )
      .gte("ordered_at", start)
      .lte("ordered_at", end)
      .order("ordered_at", { ascending: false })
      .range(from, to);

    if (platform) {
      query = query.eq("platform", platform);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch Supabase orders:", error.message);
      return {
        orders: rows.map((row) => mapOrderRowToDashboardOrder(row)),
        error: error.message,
        hitLimit: false,
      };
    }

    const pageRows = (data ?? []) as unknown as OrderRow[];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      return {
        orders: rows.map((row) => mapOrderRowToDashboardOrder(row)),
        error: null,
        hitLimit: false,
      };
    }
  }

  return {
    orders: rows.map((row) => mapOrderRowToDashboardOrder(row)),
    error: null,
    hitLimit: true,
  };
}

async function getOrderItemsByDateRange({
  start,
  end,
  platform,
}: OrdersRangeQuery): Promise<{
  rows: OrderItemRow[];
  error: string | null;
  hitLimit: boolean;
}> {
  const pageSize = 1000;
  const maxRows = 10000;
  const rows: OrderItemRow[] = [];

  // Dashboard SKU summary may scan thousands of lines. Read in 1000-row pages
  // and cap at 10000 so the browser/serverless workload stays bounded.
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = from + pageSize - 1;
    let query = supabase
      .from("order_items")
      .select(
        [
          "sync_key",
          "order_no",
          "platform",
          "country",
          "currency",
          "sku",
          "product_name",
          "image_url",
          "quantity",
          "unit_price_mxn",
          "total_price_mxn",
          "ordered_at",
          "meli_item_id",
          "variation_id",
        ].join(","),
      )
      .gte("ordered_at", start)
      .lte("ordered_at", end)
      .order("ordered_at", { ascending: false })
      .range(from, to);

    if (platform) {
      query = query.eq("platform", platform);
    }

    const { data, error } = await query;

    if (error) {
      return {
        rows,
        error: error.message,
        hitLimit: false,
      };
    }

    const pageRows = (data ?? []) as unknown as OrderItemRow[];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      return {
        rows,
        error: null,
        hitLimit: false,
      };
    }
  }

  return {
    rows,
    error: null,
    hitLimit: true,
  };
}

async function getActiveProducts(): Promise<{
  rows: ProductRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("products")
    .select(
      [
        "sku",
        "product_name",
        "image_url",
        "unit_cost_cny",
        "unit_shipping_cost_cny",
        "is_active",
        "platform_fee_formula_mxn",
        "platform_tax_formula_mxn",
        "last_mile_fee_formula_mxn",
        "ad_cost_formula_mxn",
        "other_fee_formula_mxn",
      ].join(","),
    )
    .eq("is_active", true);

  return {
    rows: ((data ?? []) as unknown as ProductRow[]) ?? [],
    error: error?.message ?? null,
  };
}

export async function getGlobalExchangeRate(): Promise<{
  value: number;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "exchange_rate_mxn_to_cny")
    .maybeSingle();

  if (error) {
    return {
      value: 0.42,
      error: error.message,
    };
  }

  const parsed = Number(data?.value);

  return {
    value: Number.isFinite(parsed) && parsed > 0 ? parsed : 0.42,
    error: null,
  };
}

export async function getSkuDashboardDataResult(
  query: OrdersRangeQuery,
): Promise<SkuDashboardResult> {
  const [ordersResult, itemsResult, productsResult, exchangeRateResult] = await Promise.all([
    getOrdersByDateRangeResult(query),
    getOrderItemsByDateRange(query),
    getActiveProducts(),
    getGlobalExchangeRate(),
  ]);

  const error =
    ordersResult.error ??
    itemsResult.error ??
    productsResult.error ??
    exchangeRateResult.error ??
    null;

  if (error) {
    return {
      skuSummaries: [],
      recentOrders: ordersResult.orders.slice(0, 100),
      orderCount: ordersResult.orders.length,
      exchangeRate: exchangeRateResult.value,
      error,
      hitLimit: ordersResult.hitLimit || itemsResult.hitLimit,
    };
  }

  const productsBySku = new Map(
    productsResult.rows.map((product) => [product.sku, product]),
  );

  const summaries = new Map<
    string,
    Omit<SkuSummary, "profitMargin"> & { orderNos: Set<string> }
  >();

  itemsResult.rows.forEach((item) => {
    const sku = item.sku || "UNMAPPED";
    const product = productsBySku.get(sku);
    const quantity = item.quantity ?? 0;
    const salesMxn = item.total_price_mxn ?? 0;
    const productCostCny = (product?.unit_cost_cny ?? 0) * quantity;
    const shippingCostCny =
      (product?.unit_shipping_cost_cny ?? 0) * quantity;
    const salesCny = salesMxn * exchangeRateResult.value;
    const current =
      summaries.get(sku) ??
      {
        sku,
        productName: product?.product_name || item.product_name || sku,
        imageUrl: product?.image_url || item.image_url || null,
        orderCount: 0,
        orderNos: new Set<string>(),
        quantity: 0,
        salesMxn: 0,
        salesCny: 0,
        productCostCny: 0,
        shippingCostCny: 0,
        platformFeeMxn: 0,
        platformTaxMxn: 0,
        lastMileFeeMxn: 0,
        adCostMxn: 0,
        otherFeeMxn: 0,
        feesTotalMxn: 0,
        feesTotalCny: 0,
        profitCny: 0,
        costConfigured: Boolean(
          product &&
            (product.unit_cost_cny !== null ||
              product.unit_shipping_cost_cny !== null),
        ),
        formulaErrors: [],
      };

    current.orderNos.add(item.order_no);
    current.orderCount = current.orderNos.size;
    current.quantity += quantity;
    current.salesMxn += salesMxn;
    current.salesCny += salesCny;
    current.productCostCny += productCostCny;
    current.shippingCostCny += shippingCostCny;
    summaries.set(sku, current);
  });

  return {
    skuSummaries: Array.from(summaries.values()).map((summary) => {
      const product = productsBySku.get(summary.sku);
      const variables = {
        sales_mxn: summary.salesMxn,
        quantity: summary.quantity,
        order_count: summary.orderCount,
        unit_price_mxn:
          summary.quantity > 0 ? summary.salesMxn / summary.quantity : 0,
        exchange_rate: exchangeRateResult.value,
      };
      const formulas = [
        ["平台佣金公式", "platformFeeMxn", product?.platform_fee_formula_mxn],
        ["平台税费公式", "platformTaxMxn", product?.platform_tax_formula_mxn],
        ["尾端派送费公式", "lastMileFeeMxn", product?.last_mile_fee_formula_mxn],
        ["广告费公式", "adCostMxn", product?.ad_cost_formula_mxn],
        ["其他费用公式", "otherFeeMxn", product?.other_fee_formula_mxn],
      ] as const;
      const formulaValues = {
        platformFeeMxn: 0,
        platformTaxMxn: 0,
        lastMileFeeMxn: 0,
        adCostMxn: 0,
        otherFeeMxn: 0,
      };
      const formulaErrors: string[] = [];

      formulas.forEach(([label, key, formula]) => {
        const result = safeFormula(formula, variables);

        formulaValues[key] = result.value;

        if (result.error) {
          formulaErrors.push(`${summary.sku} ${label}：${result.error}`);
        }
      });

      const feesTotalMxn =
        formulaValues.platformFeeMxn +
        formulaValues.platformTaxMxn +
        formulaValues.lastMileFeeMxn +
        formulaValues.adCostMxn +
        formulaValues.otherFeeMxn;
      const feesTotalCny = feesTotalMxn * exchangeRateResult.value;
      const profitCny =
        summary.salesCny -
        summary.productCostCny -
        summary.shippingCostCny -
        feesTotalCny;

      return {
        sku: summary.sku,
        productName: summary.productName,
        imageUrl: summary.imageUrl,
        orderCount: summary.orderCount,
        quantity: summary.quantity,
        salesMxn: summary.salesMxn,
        salesCny: summary.salesCny,
        productCostCny: summary.productCostCny,
        shippingCostCny: summary.shippingCostCny,
        ...formulaValues,
        feesTotalMxn,
        feesTotalCny,
        profitCny,
        profitMargin: summary.salesCny > 0 ? profitCny / summary.salesCny : 0,
        costConfigured: summary.costConfigured,
        formulaErrors,
      };
    }),
    recentOrders: ordersResult.orders.slice(0, 100),
    orderCount: ordersResult.orders.length,
    exchangeRate: exchangeRateResult.value,
    error: null,
    hitLimit: ordersResult.hitLimit || itemsResult.hitLimit,
  };
}

export async function getOrderDetailsResult({
  start,
  end,
  search = "",
  page = 1,
  pageSize = 50,
}: OrdersRangeQuery & {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<OrderDetailsResult> {
  const [ordersResult, itemsResult, exchangeRateResult] = await Promise.all([
    getOrdersByDateRangeResult({ start, end }),
    getOrderItemsByDateRange({ start, end }),
    getGlobalExchangeRate(),
  ]);
  const error =
    ordersResult.error ?? itemsResult.error ?? exchangeRateResult.error ?? null;

  if (error) {
    return {
      rows: [],
      total: 0,
      error,
      hitLimit: ordersResult.hitLimit || itemsResult.hitLimit,
    };
  }

  const ordersByNo = new Map(
    ordersResult.orders.map((order) => [order.orderNo, order]),
  );
  const keyword = search.trim().toLowerCase();
  const allRows = itemsResult.rows
    .map((item) => {
      const order = ordersByNo.get(item.order_no);
      const salesMxn = item.total_price_mxn ?? 0;

      return {
        orderNo: item.order_no,
        orderedAt: item.ordered_at,
        status: order?.status ?? "unknown",
        sku: item.sku || "UNMAPPED",
        productName: item.product_name || item.sku || "UNMAPPED",
        quantity: item.quantity ?? 0,
        salesMxn,
        salesCny: salesMxn * exchangeRateResult.value,
        exchangeRate: exchangeRateResult.value,
        platform: item.platform,
      };
    })
    .filter((row) => {
      if (!keyword) {
        return true;
      }

      return (
        row.orderNo.toLowerCase().includes(keyword) ||
        row.sku.toLowerCase().includes(keyword) ||
        row.productName.toLowerCase().includes(keyword) ||
        row.status.toLowerCase().includes(keyword)
      );
    });

  const startIndex = (Math.max(1, page) - 1) * pageSize;

  return {
    rows: allRows.slice(startIndex, startIndex + pageSize),
    total: allRows.length,
    error: null,
    hitLimit: ordersResult.hitLimit || itemsResult.hitLimit,
  };
}
