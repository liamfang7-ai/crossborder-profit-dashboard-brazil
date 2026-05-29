"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { MetricCard } from "@/components/metric-card";
import { formatCurrency, formatPercent } from "@/lib/profit";
import {
  getSkuDashboardDataResult,
  supabase,
  type DashboardOrder,
  type OrdersRangeQuery,
  type SkuSummary,
} from "@/lib/supabase";
import {
  formatMexicoTime,
  getMexicoDateBounds,
  getMexicoDateRange,
  mexicoDateInputValue,
  type MexicoRangeType,
  validateMexicoCustomRange,
} from "@/lib/mexico-time";

type SortKey = "quantity" | "salesMxn" | "profitCny" | "profitMargin";

type DashboardClientProps = {
  initialSkuSummaries: SkuSummary[];
  initialRecentOrders: DashboardOrder[];
  initialOrderCount: number;
  initialExchangeRate: number;
  initialHitLimit: boolean;
  initialRange: {
    start: string;
    end: string;
  };
};

type Totals = {
  orderCount: number;
  quantity: number;
  salesMxn: number;
  salesCny: number;
  productCostCny: number;
  shippingCostCny: number;
  feesTotalCny: number;
  profitCny: number;
};

const rangeOptions: Array<{ value: MexicoRangeType; label: string }> = [
  { value: "today", label: "今日" },
  { value: "7d", label: "近7天" },
  { value: "month", label: "本月" },
  { value: "30d", label: "近30天" },
  { value: "90d", label: "近90天" },
  { value: "custom", label: "自定义日期范围" },
];

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "quantity", label: "出单件数" },
  { value: "salesMxn", label: "销售额" },
  { value: "profitCny", label: "利润" },
  { value: "profitMargin", label: "利润率" },
];

function Navigation() {
  const links = [
    ["Dashboard", "/"],
    ["Mercado Libre API", "/mercadolibre"],
    ["SKU 产品管理", "/products"],
    ["订单明细", "/orders"],
    ["备用 CSV 导入", "/import"],
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      {links.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="rounded-full border border-slate-200 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
        >
          {label}
        </Link>
      ))}
      <LogoutButton />
    </div>
  );
}

export function DashboardClient({
  initialSkuSummaries,
  initialRecentOrders,
  initialOrderCount,
  initialExchangeRate,
  initialHitLimit,
  initialRange,
}: DashboardClientProps) {
  const [skuSummaries, setSkuSummaries] = useState(initialSkuSummaries);
  const [recentOrders, setRecentOrders] = useState(initialRecentOrders);
  const [orderCount, setOrderCount] = useState(initialOrderCount);
  const [exchangeRate, setExchangeRate] = useState(initialExchangeRate);
  const [rangeType, setRangeType] = useState<MexicoRangeType>("month");
  const [sortKey, setSortKey] = useState<SortKey>("quantity");
  const [customStartDate, setCustomStartDate] = useState(() =>
    mexicoDateInputValue(new Date(initialRange.start)),
  );
  const [customEndDate, setCustomEndDate] = useState(() =>
    mexicoDateInputValue(new Date(initialRange.end)),
  );
  const [pendingStartDate, setPendingStartDate] = useState(customStartDate);
  const [pendingEndDate, setPendingEndDate] = useState(customEndDate);
  const [dateBounds] = useState(() =>
    getMexicoDateBounds(new Date(initialRange.end)),
  );
  const [dateRangeError, setDateRangeError] = useState("");
  const [showFeeDetails, setShowFeeDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [hitLimit, setHitLimit] = useState(initialHitLimit);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [lastUpdatedText, setLastUpdatedText] = useState("--");
  const [syncStatus, setSyncStatus] = useState("实时同步中");

  const selectedRange = useMemo(
    () => getMexicoDateRange(rangeType, customStartDate, customEndDate),
    [customEndDate, customStartDate, rangeType],
  );
  const queryFilters = useMemo<OrdersRangeQuery>(
    () => ({
      start: selectedRange.start.toISOString(),
      end: selectedRange.end.toISOString(),
    }),
    [selectedRange.end, selectedRange.start],
  );

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    const result = await getSkuDashboardDataResult(queryFilters);

    if (result.error) {
      setQueryError(result.error);
      setSyncStatus("实时同步中");
      setIsLoading(false);
      return;
    }

    setSkuSummaries(result.skuSummaries);
    setRecentOrders(result.recentOrders);
    setOrderCount(result.orderCount);
    setExchangeRate(result.exchangeRate);
    setHitLimit(result.hitLimit);
    setQueryError("");
    setLastUpdatedAt(new Date());
    setSyncStatus("实时同步中");
    setIsLoading(false);
  }, [queryFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLastUpdatedText(formatMexicoTime(lastUpdatedAt));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [lastUpdatedAt]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshData]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-sku-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => void refreshData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => void refreshData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => void refreshData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => void refreshData(),
      )
      .subscribe((status) => {
        if (
          status === "SUBSCRIBED" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setSyncStatus("实时同步中");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const sortedSkus = useMemo(
    () =>
      [...skuSummaries].sort((a, b) => {
        const value = b[sortKey] - a[sortKey];

        return value || b.quantity - a.quantity;
      }),
    [skuSummaries, sortKey],
  );

  const totals = useMemo<Totals>(
    () =>
      skuSummaries.reduce(
        (summary, sku) => ({
          orderCount: summary.orderCount,
          quantity: summary.quantity + sku.quantity,
          salesMxn: summary.salesMxn + sku.salesMxn,
          salesCny: summary.salesCny + sku.salesCny,
          productCostCny: summary.productCostCny + sku.productCostCny,
          shippingCostCny: summary.shippingCostCny + sku.shippingCostCny,
          feesTotalCny: summary.feesTotalCny + sku.feesTotalCny,
          profitCny: summary.profitCny + sku.profitCny,
        }),
        {
          orderCount,
          quantity: 0,
          salesMxn: 0,
          salesCny: 0,
          productCostCny: 0,
          shippingCostCny: 0,
          feesTotalCny: 0,
          profitCny: 0,
        },
      ),
    [orderCount, skuSummaries],
  );
  const profitMargin =
    totals.salesCny > 0 ? totals.profitCny / totals.salesCny : 0;
  const formulaErrors = skuSummaries.flatMap((sku) => sku.formulaErrors);
  const customRangeText =
    rangeType === "custom"
      ? `当前筛选：${customStartDate} 至 ${customEndDate}`
      : "";

  function applyQuickRange(value: MexicoRangeType) {
    if (value === "custom") {
      setRangeType("custom");
      return;
    }

    setDateRangeError("");
    setRangeType(value);
  }

  function applyCustomRange() {
    const validation = validateMexicoCustomRange(
      pendingStartDate,
      pendingEndDate,
      new Date(),
    );

    if (!validation.ok) {
      setDateRangeError(validation.message);
      return;
    }

    setCustomStartDate(pendingStartDate);
    setCustomEndDate(pendingEndDate);
    setRangeType("custom");
    setDateRangeError("");
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-500">
            时间基准：墨西哥城时间 America/Mexico_City
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
            跨境电商实时利润看板
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
              {syncStatus}
            </span>
            <span>最近更新：{lastUpdatedText}</span>
          </div>
          <Navigation />
        </header>

        <section className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-200/60">
          <div className="grid gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                最近90天 SKU 汇总
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                系统仅保留最近90天订单和 SKU 明细，90天以前数据会自动清理。利润按 SKU 产品管理中的成本和费用公式计算。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {rangeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    rangeType === option.value
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => applyQuickRange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">开始日期</span>
                <input
                  type="date"
                  min={dateBounds.minDate}
                  max={dateBounds.maxDate}
                  value={pendingStartDate}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-700"
                  onChange={(event) => setPendingStartDate(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">结束日期</span>
                <input
                  type="date"
                  min={dateBounds.minDate}
                  max={dateBounds.maxDate}
                  value={pendingEndDate}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-700"
                  onChange={(event) => setPendingEndDate(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="h-10 self-end rounded-lg bg-slate-950 px-4 text-sm font-medium text-white"
                onClick={applyCustomRange}
              >
                应用筛选
              </button>
            </div>
            {customRangeText ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                {customRangeText}
              </p>
            ) : null}
            {dateRangeError ? (
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {dateRangeError}
              </p>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">SKU 排序</span>
                <select
                  value={sortKey}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-700"
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                当前汇率：1 MXN = {exchangeRate} CNY
              </div>
            </div>
            {isLoading ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                正在加载最近90天 SKU 汇总...
              </p>
            ) : null}
            {hitLimit ? (
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                当前结果超过10000行，建议缩小日期范围。
              </p>
            ) : null}
            {formulaErrors.length > 0 ? (
              <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                公式错误：{formulaErrors.slice(0, 3).join("；")}
              </p>
            ) : null}
            {queryError ? (
              <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {queryError}
              </p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="订单数" value={`${totals.orderCount} 单`} />
          <MetricCard title="销售额 MXN" value={formatCurrency(totals.salesMxn, "MXN")} />
          <MetricCard title="折算销售额 CNY" value={formatCurrency(totals.salesCny, "CNY")} />
          <MetricCard title="商品成本 CNY" value={formatCurrency(totals.productCostCny, "CNY")} tone="cost" />
          <MetricCard title="头程物流 CNY" value={formatCurrency(totals.shippingCostCny, "CNY")} tone="cost" />
          <MetricCard title="费用合计 CNY" value={formatCurrency(totals.feesTotalCny, "CNY")} tone="warning" />
          <MetricCard title="预估利润 CNY" value={formatCurrency(totals.profitCny, "CNY")} tone="profit" />
          <MetricCard title="利润率" value={formatPercent(profitMargin)} tone="profit" />
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">SKU 汇总</h2>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setShowFeeDetails((value) => !value)}
            >
              {showFeeDetails ? "隐藏费用明细" : "展开费用明细"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">图片</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">产品名称</th>
                  <th className="px-4 py-3">订单数</th>
                  <th className="px-4 py-3">出单件数</th>
                  <th className="px-4 py-3">销售额 MXN</th>
                  <th className="px-4 py-3">销售额 CNY</th>
                  <th className="px-4 py-3">商品成本 CNY</th>
                  <th className="px-4 py-3">头程物流 CNY</th>
                  <th className="px-4 py-3">费用合计 CNY</th>
                  <th className="px-4 py-3">预估利润 CNY</th>
                  <th className="px-4 py-3">利润率</th>
                  <th className="px-4 py-3">成本状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sortedSkus.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-slate-500">
                      暂无 SKU 数据
                    </td>
                  </tr>
                ) : (
                  sortedSkus.map((sku) => (
                    <tr key={sku.sku} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        {sku.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sku.imageUrl} alt={sku.productName} className="h-12 w-12 rounded object-cover" />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                            无图
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{sku.sku}</td>
                      <td className="min-w-[220px] px-4 py-3">{sku.productName}</td>
                      <td className="whitespace-nowrap px-4 py-3">{sku.orderCount}</td>
                      <td className="whitespace-nowrap px-4 py-3">{sku.quantity}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatCurrency(sku.salesMxn, "MXN")}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatCurrency(sku.salesCny, "CNY")}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatCurrency(sku.productCostCny, "CNY")}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatCurrency(sku.shippingCostCny, "CNY")}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatCurrency(sku.feesTotalCny, "CNY")}</td>
                      <td className={`whitespace-nowrap px-4 py-3 font-semibold ${sku.profitCny >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatCurrency(sku.profitCny, "CNY")}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatPercent(sku.profitMargin)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sku.costConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {sku.costConfigured ? "已配置" : "未配置成本"}
                        </span>
                        {sku.formulaErrors.length > 0 ? (
                          <p className="mt-1 text-xs text-rose-600">公式错误</p>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showFeeDetails ? (
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">费用明细</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">平台佣金 MXN / CNY</th>
                    <th className="px-4 py-3">平台税费 MXN / CNY</th>
                    <th className="px-4 py-3">尾端派送费 MXN / CNY</th>
                    <th className="px-4 py-3">广告费 MXN / CNY</th>
                    <th className="px-4 py-3">其他费用 MXN / CNY</th>
                    <th className="px-4 py-3">公式状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sortedSkus.map((sku) => (
                    <tr key={sku.sku}>
                      <td className="px-4 py-3 font-medium text-slate-950">{sku.sku}</td>
                      <td className="px-4 py-3">{formatCurrency(sku.platformFeeMxn, "MXN")} / {formatCurrency(sku.platformFeeMxn * exchangeRate, "CNY")}</td>
                      <td className="px-4 py-3">{formatCurrency(sku.platformTaxMxn, "MXN")} / {formatCurrency(sku.platformTaxMxn * exchangeRate, "CNY")}</td>
                      <td className="px-4 py-3">{formatCurrency(sku.lastMileFeeMxn, "MXN")} / {formatCurrency(sku.lastMileFeeMxn * exchangeRate, "CNY")}</td>
                      <td className="px-4 py-3">{formatCurrency(sku.adCostMxn, "MXN")} / {formatCurrency(sku.adCostMxn * exchangeRate, "CNY")}</td>
                      <td className="px-4 py-3">{formatCurrency(sku.otherFeeMxn, "MXN")} / {formatCurrency(sku.otherFeeMxn * exchangeRate, "CNY")}</td>
                      <td className="px-4 py-3">
                        {sku.formulaErrors.length === 0 ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">正常</span>
                        ) : (
                          <span className="text-xs text-rose-600">
                            {sku.formulaErrors.join("；")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
          <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                数据来源：订单明细
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                当前筛选范围内最近订单样本：{recentOrders.length} 条。完整明细只读查看，不再编辑订单成本。
              </p>
            </div>
            <Link
              href="/orders"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              查看订单明细
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
