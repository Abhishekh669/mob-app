import { useGetFetchApprovalRequests } from "@/hooks/tanstack/query-hook/approve-request/use-get-approve-request";
import { useGetOrderRequests } from "@/hooks/tanstack/query-hook/order/use-get-order-requests";
import { useGetOrdersStatus } from "@/hooks/tanstack/query-hook/order/use-get-all-orders-status";
import { countOrderRequestTableSessions } from "@/utils/staff-alerts/count-order-request-tables";
import {
  presentStaffAlert,
  requestStaffAlertPermissions,
} from "@/utils/staff-alerts/present-staff-alert";
import {
  useStaffAlertsStore,
  type StaffAlertChannel,
} from "@/utils/store/staff-alerts/use-staff-alerts-store";
import { useEffect, useMemo, useRef } from "react";

function approvalCount(data: ReturnType<typeof useGetFetchApprovalRequests>["data"]): number | null {
  if (!data?.success) return null;
  return data.requests?.length ?? 0;
}

function kitchenCount(data: ReturnType<typeof useGetOrdersStatus>["data"]): number | null {
  if (!data?.success) return null;
  return data.order_requests?.length ?? 0;
}

function orderRequestCount(data: ReturnType<typeof useGetOrderRequests>["data"]): number | null {
  if (!data?.success) return null;
  return countOrderRequestTableSessions(data.order_requests);
}

export function useStaffAlertsSync(pathname: string) {
  const approvalQuery = useGetFetchApprovalRequests(true);
  const orderQuery = useGetOrderRequests(true);
  const kitchenQuery = useGetOrdersStatus(true);

  const counts = useMemo(
    () => ({
      approval: approvalCount(approvalQuery.data),
      orderRequest: orderRequestCount(orderQuery.data),
      ordersStatus: kitchenCount(kitchenQuery.data),
    }),
    [approvalQuery.data, orderQuery.data, kitchenQuery.data]
  );

  const activeApproval = pathname.includes("approval-requests");
  const activeOrder = pathname.includes("order-request");
  const activeKitchen = pathname.includes("orders-status");

  const prevPoll = useRef<Record<StaffAlertChannel, number>>({
    approval: -1,
    orderRequest: -1,
    ordersStatus: -1,
  });

  useEffect(() => {
    void requestStaffAlertPermissions();
  }, []);

  useEffect(() => {
    const run = (channel: StaffAlertChannel, current: number | null, isActive: boolean, title: string) => {
      if (current === null) return;
      const store = useStaffAlertsStore.getState();
      const playSound = store.alertSoundEnabled;

      if (!store[channel].primed) {
        store.primeChannel(channel, current);
        prevPoll.current[channel] = current;
        return;
      }

      if (isActive) {
        store.syncWhileViewing(channel, current);
        prevPoll.current[channel] = current;
        return;
      }

      store.trimChannel(channel, current);

      const prev = prevPoll.current[channel];
      prevPoll.current[channel] = current;

      if (prev >= 0 && current > prev && playSound) {
        const gained = current - prev;
        void presentStaffAlert(
          title,
          gained === 1 ? "You have a new update." : `${gained} new updates.`,
          true
        );
      }
    };

    run("approval", counts.approval, activeApproval, "Approvals");
    run("orderRequest", counts.orderRequest, activeOrder, "Orders");
    run("ordersStatus", counts.ordersStatus, activeKitchen, "Kitchen");
  }, [
    counts.approval,
    counts.orderRequest,
    counts.ordersStatus,
    activeApproval,
    activeOrder,
    activeKitchen,
  ]);

  const approvalSnap = useStaffAlertsStore((s) => s.approval);
  const orderSnap = useStaffAlertsStore((s) => s.orderRequest);
  const kitchenSnap = useStaffAlertsStore((s) => s.ordersStatus);

  return useMemo(
    () => ({
      approval:
        counts.approval === null || !approvalSnap.primed
          ? 0
          : Math.max(0, counts.approval - approvalSnap.lastSeen),
      orderRequest:
        counts.orderRequest === null || !orderSnap.primed
          ? 0
          : Math.max(0, counts.orderRequest - orderSnap.lastSeen),
      ordersStatus:
        counts.ordersStatus === null || !kitchenSnap.primed
          ? 0
          : Math.max(0, counts.ordersStatus - kitchenSnap.lastSeen),
    }),
    [
      counts.approval,
      counts.orderRequest,
      counts.ordersStatus,
      approvalSnap.lastSeen,
      approvalSnap.primed,
      orderSnap.lastSeen,
      orderSnap.primed,
      kitchenSnap.lastSeen,
      kitchenSnap.primed,
    ]
  );
}
