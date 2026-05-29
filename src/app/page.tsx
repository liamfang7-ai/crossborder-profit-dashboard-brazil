import { DashboardClient } from "@/components/dashboard-client";
import { getDefaultMarketMonthRange } from "@/lib/market-time";
import { getSkuDashboardDataResult } from "@/lib/supabase";

export const revalidate = 0;

export default async function DashboardPage() {
  const initialRange = getDefaultMarketMonthRange();
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
