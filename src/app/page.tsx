import { DashboardClient } from "@/components/dashboard-client";
import { getDefaultMexicoMonthRange } from "@/lib/mexico-time";
import { getSkuDashboardDataResult } from "@/lib/supabase";

export const revalidate = 0;

export default async function DashboardPage() {
  const initialRange = getDefaultMexicoMonthRange();
  const result = await getSkuDashboardDataResult({
    start: initialRange.start,
    end: initialRange.end,
  });

  return (
    <DashboardClient
      initialSkuSummaries={result.skuSummaries}
      initialRecentOrders={result.recentOrders}
      initialOrderCount={result.orderCount}
      initialExchangeRate={result.exchangeRate}
      initialHitLimit={result.hitLimit}
      initialRange={initialRange}
    />
  );
}
