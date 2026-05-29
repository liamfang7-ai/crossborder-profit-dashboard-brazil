"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/profit";
import {
  getOrderDetailsResult,
  type OrderDetailRow,
  type OrdersRangeQuery,
} from "@/lib/supabase";
import {
  formatMarketDateTime,
  getMarketDateBounds,
  getMarketDateRange,
  type MarketRangeType,
  marketDateInputValue,
  validateMarketCustomRange,
} from "@/lib/market-time";

const rangeOptions: Array<{ value: MarketRangeType; label: string }> = [
  { value: "today", label: "今日" },
  { value: "month", label: "本月" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
  { value: "custom", label: "自定义日期范围" },
];

type OrdersDetailClientProps = {
  initialRange: {
    start: string;
    end: string;
  };
};

export function OrdersDetailClient({ initialRange }: OrdersDetailClientProps) {
  const [rangeType, setRangeType] = useState<MarketRangeType>("month");
  const [customStartDate, setCustomStartDate] = useState(() =>
    marketDateInputValue(new Date(initialRange.start)),
  );
  const [customEndDate, setCustomEndDate] = useState(() =>
    marketDateInputValue(new Date(initialRange.end)),
  );
  const [pendingStartDate, setPendingStartDate] = useState(customStartDate);
  const [pendingEndDate, setPendingEndDate] = useState(customEndDate);
  const [dateBounds] = useState(() =>
    getMarketDateBounds(new Date(initialRange.end)),
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<OrderDetailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [dateRangeError, setDateRangeError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const range = useMemo(
    () => getMarketDateRange(rangeType, customStartDate, customEndDate),
    [customEndDate, customStartDate, rangeType],
  );
  const query = useMemo<OrdersRangeQuery>(
    () => ({
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    }),
    [range.end, range.start],
  );
  const totalPages = Math.max(1, Math.ceil(total / 50));
  const customRangeText =
    rangeType === "custom"
      ? `当前筛选：${customStartDate} 至 ${customEndDate}`
      : "";

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    const result = await getOrderDetailsResult({
      ...query,
      search,
      page,
      pageSize: 50,
    });

    if (result.error) {
      setError(result.error);
      setRows([]);
      setTotal(0);
    } else {
      setError("");
      setRows(result.rows);
      setTotal(result.total);
    }

    setIsLoading(false);
  }, [page, query, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRows]);

  function applyQuickRange(value: MarketRangeType) {
    if (value === "custom") {
      setRangeType("custom");
      return;
    }

    setDateRangeError("");
    setRangeType(value);
    setPage(1);
  }

  function applyCustomRange() {
    const validation = validateMarketCustomRange(
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
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                时间基准：São Paulo 时间 America/Sao_Paulo
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                订单明细
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                订单明细仅用于查看订单和商品行，不再编辑成本。系统仅保留最近 90 天订单数据。
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              返回 Dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-200/60">
          <div className="grid gap-4">
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
              系统仅保留最近 90 天订单数据。
            </p>
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
                  onClick={() => {
                    applyQuickRange(option.value);
                  }}
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
            <label className="grid gap-2 text-sm md:max-w-md">
              <span className="font-medium text-slate-700">
                搜索订单号、SKU、产品名称、状态
              </span>
              <input
                value={search}
                className="h-10 rounded-lg border border-slate-200 px-3"
                placeholder="输入关键词"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            {isLoading ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                正在加载订单明细...
              </p>
            ) : null}
            {error ? (
              <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">
              商品行明细
            </h2>
            <p className="text-sm text-slate-500">
              共 {total} 条，每页 50 条
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">订单号</th>
                  <th className="px-4 py-3">下单时间</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">产品名称</th>
                  <th className="px-4 py-3">数量</th>
                  <th className="px-4 py-3">销售额 BRL</th>
                  <th className="px-4 py-3">销售额 CNY</th>
                  <th className="px-4 py-3">汇率</th>
                  <th className="px-4 py-3">平台</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                      暂无订单明细
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={`${row.orderNo}-${row.sku}-${row.orderedAt}`} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{row.orderNo}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatMarketDateTime(new Date(row.orderedAt))}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.status}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.sku}</td>
                      <td className="min-w-[220px] px-4 py-3">{row.productName}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.quantity}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatCurrency(row.salesMxn, "BRL")}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatCurrency(row.salesCny, "CNY")}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.exchangeRate}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.platform}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:text-slate-300"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              上一页
            </button>
            <span className="text-sm text-slate-500">
              第 {page} / {totalPages} 页
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:text-slate-300"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              下一页
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
