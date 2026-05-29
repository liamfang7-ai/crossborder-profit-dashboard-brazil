import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import {
  dashboardAuthCookieName,
  getDashboardAuthConfig,
  getDashboardAuthConfigError,
  verifyDashboardSession,
} from "@/lib/dashboard-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const config = getDashboardAuthConfig();
  const isLoggedIn = await verifyDashboardSession(
    cookieStore.get(dashboardAuthCookieName)?.value,
    config.sessionSecret,
  );

  if (isLoggedIn) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 text-slate-950">
      <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-5 py-6 shadow-sm shadow-slate-200/60 sm:px-6">
        <p className="text-sm font-medium text-slate-500">
          Sonic Crossborder Brazil
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
          内部订单利润统计系统登录
        </h1>
        <LoginForm configError={getDashboardAuthConfigError()} />
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          <p>本系统为 Sonic 内部订单利润统计工具，仅供授权员工使用。</p>
          <p className="mt-1">
            本系统不是 Mercado Livre 官方网站，也不提供 Mercado Livre 账号登录服务。
          </p>
          <p className="mt-2 text-amber-800">
            This internal dashboard is operated by Sonic and is not affiliated with,
            endorsed by, or operated by Mercado Livre.
          </p>
        </div>
      </section>
    </main>
  );
}
