import type { CustomerOrderRequest } from "@/utils/types/order/order.types";

/** Matches grouping on `order-request/index` — one badge unit per active table session. */
export function countOrderRequestTableSessions(
  order_requests: CustomerOrderRequest[] | undefined
): number {
  const list = order_requests ?? [];
  const valid = list.filter((o) => o?.order_items?.length > 0 && o?.table_session?.id);
  const ids = new Set(valid.map((o) => o.table_session!.id));
  return ids.size;
}
