"use client";

import { useState } from "react";

type SyncResult = {
  ok: boolean;
  fetched?: number;
  synced?: number;
  itemsSynced?: number;
  pages?: number;
  skipped?: number;
  warnings?: string[];
  error?: string;
};

type SyncMode = "today" | "7d";

export function MercadoLibreSyncClient() {
  const [syncingMode, setSyncingMode] = useState<SyncMode | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function syncOrders(mode: SyncMode) {
    setSyncingMode(mode);
    setResult(null);

    try {
      const response = await fetch("/api/mercadolibre/sync-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ days: mode === "today" ? 1 : 7 }),
      });
      const payload = (await response.json()) as SyncResult;

      setResult(payload);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "同步失败。",
      });
    } finally {
      setSyncingMode(null);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(syncingMode)}
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          onClick={() => void syncOrders("today")}
        >
          {syncingMode === "today" ? "正在同步今日订单..." : "同步今日订单"}
        </button>
        <button
          type="button"
          disabled={Boolean(syncingMode)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          onClick={() => void syncOrders("7d")}
        >
          {syncingMode === "7d" ? "正在同步近 7 天..." : "同步近 7 天订单"}
        </button>
      </div>
      {syncingMode ? (
        <p className="mt-3 text-sm text-slate-500">正在分页同步订单...</p>
      ) : null}
      {result?.ok ? (
        <div className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p>
            同步完成：拉取 {result.fetched ?? 0} 单，写入{" "}
            {result.synced ?? 0} 单，写入 SKU 行 {result.itemsSynced ?? 0} 条。
          </p>
          <p className="mt-1">
            页数：{result.pages ?? 0}，跳过：{result.skipped ?? 0}。
          </p>
          <p className="mt-1">请回到 Sonic Dashboard 查看 SKU 利润统计。</p>
          {result.warnings && result.warnings.length > 0 ? (
            <ul className="mt-2 list-inside list-disc">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {result && !result.ok ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          同步失败：{result.error}
        </p>
      ) : null}
    </div>
  );
}
