import Link from "next/link";
import { MercadoLibreSyncClient } from "@/components/mercadolibre-sync-client";
import {
  getMercadoLibreConfigStatus,
  getMercadoLibreConnectionStatus,
} from "@/lib/mercadolibre";

export const dynamic = "force-dynamic";

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      {ok ? "已配置" : "未配置"}
    </span>
  );
}

export default async function MercadoLibrePage() {
  const config = getMercadoLibreConfigStatus();
  const connection = await getMercadoLibreConnectionStatus();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-500">
            Mercado Libre México
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
            Mercado Libre API 连接
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            当前已支持 OAuth 授权、token 保存和最近订单手动同步。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/api/mercadolibre/auth"
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            >
              连接 Mercado Libre
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              返回看板
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
          <h2 className="text-base font-semibold text-slate-950">
            环境变量状态
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span>MELI_CLIENT_ID</span>
              <StatusBadge ok={config.clientId} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span>MELI_CLIENT_SECRET</span>
              <StatusBadge ok={config.clientSecret} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span>MELI_REDIRECT_URI</span>
              <StatusBadge ok={config.redirectUri} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span>MELI_SITE</span>
              <span className="font-semibold text-slate-950">{config.site}</span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
          <h2 className="text-base font-semibold text-slate-950">连接状态</h2>
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <p>
              当前连接状态：
              <span className="ml-2 font-semibold">
                {connection.connected ? "已连接" : "未连接"}
              </span>
            </p>
            {connection.connected ? (
              <p className="mt-2 text-slate-600">user_id：{connection.userId}</p>
            ) : null}
            {connection.error ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-amber-800">
                {connection.error}
              </p>
            ) : null}
          </div>
          {connection.connected ? <MercadoLibreSyncClient /> : null}
        </section>
      </div>
    </main>
  );
}
