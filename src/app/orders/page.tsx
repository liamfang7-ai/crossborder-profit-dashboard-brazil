import { OrdersDetailClient } from "@/components/orders-detail-client";
import { getDefaultMarketMonthRange } from "@/lib/market-time";

export const revalidate = 0;

export default function OrdersPage() {
  return <OrdersDetailClient initialRange={getDefaultMarketMonthRange()} />;
}
