import Link from "next/link";

export const metadata = {
  title: "About Sonic Crossborder Brazil Dashboard",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white px-5 py-6 shadow-sm shadow-slate-200/60 sm:px-6">
        <p className="text-sm font-medium text-slate-500">
          Sonic Crossborder Brazil
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
          Sonic Crossborder Brazil Dashboard
        </h1>
        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>
            这是 Sonic 内部使用的订单同步、SKU 成本、利润统计工具，仅授权员工可访问。
          </p>
          <p>
            该系统不是 Mercado Livre 官方网站，不会要求用户输入 Mercado Livre 密码。
          </p>
          <p>
            Mercado 授权通过官方 OAuth 页面完成，授权完成后订单数据会同步到 Sonic
            内部利润看板用于运营统计。
          </p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            This internal dashboard is operated by Sonic and is not affiliated with,
            endorsed by, or operated by Mercado Livre.
          </p>
          <p>Contact: Internal operations team</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            员工登录
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            返回看板
          </Link>
        </div>
      </section>
    </main>
  );
}
