import { NextResponse } from "next/server";
import {
  countryName,
  localCurrency,
  marketplaceName,
} from "@/lib/market-config";
import { supabase } from "@/lib/supabase";

type SyncOrderBody = {
  orderNo?: unknown;
  platform?: unknown;
  country?: unknown;
  currency?: unknown;
  revenue?: unknown;
  productCost?: unknown;
  shippingCost?: unknown;
  lastMileFee?: unknown;
  platformFee?: unknown;
  platformTax?: unknown;
  adCost?: unknown;
  refundAmount?: unknown;
  otherFee?: unknown;
  exchangeRateToUsd?: unknown;
  exchangeRateMxnToCny?: unknown;
  orderedAt?: unknown;
  source?: unknown;
};

function isObject(value: unknown): value is SyncOrderBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function requiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalNumber(value: unknown, fallback: number) {
  if (value === undefined || value === null) {
    return fallback;
  }

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalDateString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return new Date().toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!isObject(body)) {
      return NextResponse.json(
        { success: false, error: "Request body must be a JSON object." },
        { status: 400 },
      );
    }

    const orderNo = requiredString(body.orderNo);

    if (!orderNo) {
      return NextResponse.json(
        { success: false, error: "orderNo is required." },
        { status: 400 },
      );
    }

    const revenue = requiredNumber(body.revenue);

    if (revenue === null) {
      return NextResponse.json(
        { success: false, error: "revenue must be a number." },
        { status: 400 },
      );
    }

    const productCost = optionalNumber(body.productCost, 0);
    const shippingCost = optionalNumber(body.shippingCost, 0);
    const lastMileFee = optionalNumber(body.lastMileFee, 0);
    const platformFee = optionalNumber(body.platformFee, 0);
    const platformTax = optionalNumber(body.platformTax, 0);
    const adCost = optionalNumber(body.adCost, 0);
    const refundAmount = optionalNumber(body.refundAmount, 0);
    const otherFee = optionalNumber(body.otherFee, 0);
    const exchangeRateToUsd = optionalNumber(body.exchangeRateToUsd, 1);
    const exchangeRateMxnToCny = optionalNumber(body.exchangeRateMxnToCny, 0.42);
    const orderedAt = optionalDateString(body.orderedAt);

    const invalidNumberField =
      productCost === null
        ? "productCost"
        : shippingCost === null
          ? "shippingCost"
          : lastMileFee === null
            ? "lastMileFee"
            : platformFee === null
              ? "platformFee"
              : platformTax === null
                ? "platformTax"
                : adCost === null
                  ? "adCost"
                  : refundAmount === null
                    ? "refundAmount"
                    : otherFee === null
                      ? "otherFee"
                      : exchangeRateToUsd === null
                        ? "exchangeRateToUsd"
                        : exchangeRateMxnToCny === null
                          ? "exchangeRateMxnToCny"
                          : null;

    if (invalidNumberField) {
      return NextResponse.json(
        { success: false, error: `${invalidNumberField} must be a number.` },
        { status: 400 },
      );
    }

    if (!orderedAt) {
      return NextResponse.json(
        { success: false, error: "orderedAt must be a valid date string." },
        { status: 400 },
      );
    }

    if (typeof body.source === "string" && body.source.trim()) {
      console.log(`Syncing order ${orderNo} from ${body.source.trim()}`);
    }

    const payload = {
      order_no: orderNo,
      platform: optionalString(body.platform, marketplaceName),
      country: optionalString(body.country, countryName),
      currency: optionalString(body.currency, localCurrency),
      revenue,
      product_cost: productCost,
      shipping_cost: shippingCost,
      last_mile_fee: lastMileFee,
      platform_fee: platformFee,
      platform_tax: platformTax,
      ad_cost: adCost,
      refund_amount: refundAmount,
      other_fee: otherFee,
      exchange_rate_to_usd: exchangeRateToUsd,
      exchange_rate_mxn_to_cny: exchangeRateMxnToCny,
      ordered_at: orderedAt,
    };

    const { data, error } = await supabase
      .from("orders")
      .upsert(payload, { onConflict: "order_no" })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, order: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync order.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
