import { OrdersDetailClient } from "@/components/orders-detail-client";
import { getDefaultMexicoMonthRange } from "@/lib/mexico-time";

export const revalidate = 0;

export default function OrdersPage() {
  return <OrdersDetailClient initialRange={getDefaultMexicoMonthRange()} />;
}
