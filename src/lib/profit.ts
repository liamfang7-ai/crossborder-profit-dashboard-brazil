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
  exchangeRateBrlToCny?: number;
  exchangeRateMxnToCny?: number;
};

export type ProfitResult = {
  profit: number;
  profitMargin: number;
};

export function calculateProfit(order: ProfitInput): ProfitResult {
  const exchangeRate = order.exchangeRateBrlToCny ?? order.exchangeRateMxnToCny ?? 0;
  const revenueCny = order.revenue * exchangeRate;
  const localFeesCny =
    (order.lastMileFee +
      order.platformFee +
      order.platformTax +
      order.adCost +
      order.otherFee) *
    exchangeRate;
  const profit =
    revenueCny -
    order.productCost -
    order.shippingCost -
    localFeesCny;

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
