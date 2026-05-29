import { calculateProfit } from "./profit";

export type Platform = "Shopify" | "Amazon" | "Shopee" | "Lazada";

export type Order = {
  orderNo: string;
  platform: Platform;
  country: string;
  currency: string;
  revenue: number;
  productCost: number;
  shippingCost: number;
  lastMileFee: number;
  platformFee: number;
  platformTax: number;
  adCost: number;
  refundAmount: number;
  otherFee: number;
  exchangeRateMxnToCny: number;
  orderedAt: string;
};

export type OrderWithProfit = Order & {
  profit: number;
  profitMargin: number;
};

export const mockOrders: Order[] = [
  {
    orderNo: "CB240524-1008",
    platform: "Shopify",
    country: "美国",
    currency: "USD",
    revenue: 286.9,
    productCost: 96.4,
    shippingCost: 31.2,
    lastMileFee: 0,
    platformFee: 9.46,
    platformTax: 0,
    adCost: 26.8,
    refundAmount: 0,
    otherFee: 0,
    exchangeRateMxnToCny: 0.42,
    orderedAt: "2026-05-24 10:42",
  },
  {
    orderNo: "AMZ240524-7731",
    platform: "Amazon",
    country: "德国",
    currency: "EUR",
    revenue: 198.5,
    productCost: 72.6,
    shippingCost: 24.4,
    lastMileFee: 0,
    platformFee: 29.78,
    platformTax: 0,
    adCost: 18.2,
    refundAmount: 0,
    otherFee: 0,
    exchangeRateMxnToCny: 0.42,
    orderedAt: "2026-05-24 10:16",
  },
  {
    orderNo: "SHP240524-5219",
    platform: "Shopee",
    country: "泰国",
    currency: "USD",
    revenue: 74.2,
    productCost: 28.5,
    shippingCost: 9.8,
    lastMileFee: 0,
    platformFee: 5.19,
    platformTax: 0,
    adCost: 8.1,
    refundAmount: 0,
    otherFee: 0,
    exchangeRateMxnToCny: 0.42,
    orderedAt: "2026-05-24 09:58",
  },
  {
    orderNo: "LZD240524-4402",
    platform: "Lazada",
    country: "马来西亚",
    currency: "USD",
    revenue: 126.4,
    productCost: 44.9,
    shippingCost: 14.3,
    lastMileFee: 0,
    platformFee: 8.85,
    platformTax: 0,
    adCost: 12.4,
    refundAmount: 9.9,
    otherFee: 0,
    exchangeRateMxnToCny: 0.42,
    orderedAt: "2026-05-24 09:37",
  },
  {
    orderNo: "CB240524-1007",
    platform: "Shopify",
    country: "加拿大",
    currency: "USD",
    revenue: 349.99,
    productCost: 118.2,
    shippingCost: 38.6,
    lastMileFee: 0,
    platformFee: 11.55,
    platformTax: 0,
    adCost: 34.5,
    refundAmount: 0,
    otherFee: 0,
    exchangeRateMxnToCny: 0.42,
    orderedAt: "2026-05-24 09:11",
  },
  {
    orderNo: "AMZ240524-7728",
    platform: "Amazon",
    country: "英国",
    currency: "GBP",
    revenue: 164.8,
    productCost: 61.3,
    shippingCost: 19.7,
    lastMileFee: 0,
    platformFee: 24.72,
    platformTax: 0,
    adCost: 14.6,
    refundAmount: 0,
    otherFee: 0,
    exchangeRateMxnToCny: 0.42,
    orderedAt: "2026-05-24 08:44",
  },
  {
    orderNo: "SHP240524-5208",
    platform: "Shopee",
    country: "菲律宾",
    currency: "USD",
    revenue: 58.6,
    productCost: 23.9,
    shippingCost: 7.4,
    lastMileFee: 0,
    platformFee: 4.1,
    platformTax: 0,
    adCost: 6.8,
    refundAmount: 4.5,
    otherFee: 0,
    exchangeRateMxnToCny: 0.42,
    orderedAt: "2026-05-24 08:09",
  },
  {
    orderNo: "LZD240524-4395",
    platform: "Lazada",
    country: "新加坡",
    currency: "USD",
    revenue: 218.3,
    productCost: 83.2,
    shippingCost: 22.5,
    lastMileFee: 0,
    platformFee: 15.28,
    platformTax: 0,
    adCost: 20.1,
    refundAmount: 0,
    otherFee: 0,
    exchangeRateMxnToCny: 0.42,
    orderedAt: "2026-05-24 07:51",
  },
];

export const ordersWithProfit: OrderWithProfit[] = mockOrders.map((order) => ({
  ...order,
  ...calculateProfit(order),
}));

export const platformFilters: Platform[] = [
  "Shopify",
  "Amazon",
  "Shopee",
  "Lazada",
];
