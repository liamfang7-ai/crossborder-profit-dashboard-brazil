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
          Mercado Libre México
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
          利润检测系统登录
        </h1>
        <LoginForm configError={getDashboardAuthConfigError()} />
      </section>
    </main>
  );
}
