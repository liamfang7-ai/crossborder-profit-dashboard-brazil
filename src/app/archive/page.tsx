import Link from "next/link";

export default function ArchivePage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/60">
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
            归档中心已停用
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            归档中心已停用。系统现在仅保留最近 90 天订单数据。
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            返回 Dashboard
          </Link>
        </section>
      </div>
    </main>
  );
}
