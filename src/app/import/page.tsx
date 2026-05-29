import { OrderImportClient } from "@/components/order-import-client";
import Link from "next/link";

export default function ImportPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-500">
            Mercado Livre Brasil
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
            备用 CSV 导入
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            当 Mercado Livre Brasil API 临时不可用，或需要导入其他平台订单时，可使用 CSV 导入。
          </p>
          <p className="mt-2 text-sm text-slate-500">
            第一次导入真实美客多 CSV 时，请先映射字段。映射保存后，后续同格式 CSV 可以直接导入。
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            返回看板
          </Link>
        </header>

        <OrderImportClient />
      </div>
    </main>
  );
}
