export type ProfitInput = {
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
};

export type ProfitResult = {
  profit: number;
  profitMargin: number;
};

export function calculateProfit(order: ProfitInput): ProfitResult {
  const revenueCny = order.revenue * order.exchangeRateMxnToCny;
  const mexicoFeesCny =
    (order.lastMileFee +
      order.platformFee +
      order.platformTax +
      order.adCost +
      order.otherFee) *
    order.exchangeRateMxnToCny;
  const profit =
    revenueCny -
    order.productCost -
    order.shippingCost -
    mexicoFeesCny;

  return {
    profit,
    profitMargin: revenueCny > 0 ? profit / revenueCny : 0,
  };
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
