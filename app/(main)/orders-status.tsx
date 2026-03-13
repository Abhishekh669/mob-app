import { useGetOrdersStatus } from "@/hooks/tanstack/query-hook/order/use-get-all-orders-status";
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CustomerOrderRequest,
  OrderItemType,
  orderStatus,
} from "@/utils/types/order/order.types";
import Toast from "react-native-toast-message";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  accent: "#e8622a",
  accentSoft: "#fff3ee",
  accentMid: "#fde0d2",
  ink: "#1a1410",
  ink2: "#5c4f43",
  ink3: "#9c8d82",
  surface: "#fffcf8",
  card: "#ffffff",
  divider: "#f0ebe4",
  graySoft: "#f5f4f2",
  green: "#1a8f5c",
  greenSoft: "#e8f7f0",
  blue: "#2563b8",
  blueSoft: "#eef4ff",
  amber: "#b45309",
  amberSoft: "#fef9ee",
  red: "#c0392b",
  redSoft: "#fef2f1",
};

// ─── Status config ──────────────────────────────────────────────────────────────
type StatusCfg = { label: string; bg: string; text: string; dot: string; icon: keyof typeof Ionicons.glyphMap };
const STATUS_CFG: Record<orderStatus, StatusCfg> = {
  "approved":     { label: "Approved",    bg: C.greenSoft, text: C.green,  dot: C.green,  icon: "checkmark-circle" },
  "not-approved": { label: "Pending",     bg: C.amberSoft, text: C.amber,  dot: C.amber,  icon: "time" },
  "progress":     { label: "In Progress", bg: C.blueSoft,  text: C.blue,   dot: C.blue,   icon: "cafe" },
  "completed":    { label: "Completed",   bg: C.greenSoft, text: C.green,  dot: C.green,  icon: "checkmark-done-circle" },
  "cancelled":    { label: "Cancelled",   bg: C.redSoft,   text: C.red,    dot: C.red,    icon: "close-circle" },
};

const STATUS_FILTERS: Array<{ value: orderStatus | "all"; label: string }> = [
  { value: "all",          label: "All" },
  { value: "not-approved", label: "Pending" },
  { value: "approved",     label: "Approved" },
  { value: "progress",     label: "In Progress" },
  { value: "completed",    label: "Completed" },
  { value: "cancelled",    label: "Cancelled" },
];

// ─── Dummy action (replace with real logic later) ───────────────────────────────
const dummyUpdateOrderStatus = async (
  _orderId: string,
  _itemId: string,
  _newStatus: orderStatus
): Promise<{ success: boolean }> => {
  return new Promise((res) => setTimeout(() => res({ success: true }), 700));
};

// ─── StatusBadge ───────────────────────────────────────────────────────────────
const StatusBadge = ({
  status,
  highlighted = false,
}: {
  status: orderStatus;
  highlighted?: boolean;
}) => {
  const cfg = STATUS_CFG[status];
  return (
    <View
      style={[
        sb.badge,
        { backgroundColor: cfg.bg },
        highlighted && { borderWidth: 1.5, borderColor: cfg.dot },
      ]}
    >
      <View style={[sb.dot, { backgroundColor: cfg.dot }]} />
      <Text style={[sb.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
};
const sb = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: "600" },
});

// ─── StatusActionButton ────────────────────────────────────────────────────────
const StatusActionButton = ({
  label,
  icon,
  bg,
  textColor,
  active,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  textColor: string;
  active: boolean;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      sab.btn,
      { backgroundColor: active ? bg : C.graySoft },
      active && { borderWidth: 1.5, borderColor: textColor },
      disabled && !active && sab.disabled,
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.75}
  >
    {loading ? (
      <ActivityIndicator size="small" color={textColor} />
    ) : (
      <>
        <Ionicons name={icon} size={15} color={active ? textColor : C.ink3} />
        <Text style={[sab.label, { color: active ? textColor : C.ink3 }, active && { fontWeight: "700" }]}>
          {label}
        </Text>
      </>
    )}
  </TouchableOpacity>
);
const sab = StyleSheet.create({
  btn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10 },
  label:    { fontSize: 12, fontWeight: "500" },
  disabled: { opacity: 0.4 },
});

// ─── MiniProgressBar ───────────────────────────────────────────────────────────
const MiniProgressBar = ({ pct }: { pct: number }) => (
  <View style={mpb.track}>
    <View style={[mpb.fill, { width: `${pct}%` }]} />
  </View>
);
const mpb = StyleSheet.create({
  track: { height: 4, backgroundColor: C.divider, borderRadius: 2, overflow: "hidden", flex: 1 },
  fill:  { height: "100%", backgroundColor: C.accent, borderRadius: 2 },
});

// ─── Main component ────────────────────────────────────────────────────────────
export default function OrdersStatusPage() {
  const { data, isLoading, isError, refetch, isRefetching } = useGetOrdersStatus(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  // Per-item, per-action loading: { [itemId]: orderStatus | null }
  const [loadingItem, setLoadingItem] = useState<Record<string, orderStatus | null>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<orderStatus | "all">("all");

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const orders = data?.order_requests || [];
    let total = 0, pending = 0, approved = 0, inProgress = 0, completed = 0, cancelled = 0;
    orders.forEach((o) =>
      o.order_items.forEach((item) => {
        total++;
        if (item.status === "not-approved") pending++;
        else if (item.status === "approved") approved++;
        else if (item.status === "progress") inProgress++;
        else if (item.status === "completed") completed++;
        else if (item.status === "cancelled") cancelled++;
      })
    );
    const pct = total > 0 ? Math.round(((completed + inProgress) / total) * 100) : 0;
    return { total, pending, approved, inProgress, completed, cancelled, pct };
  }, [data]);

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const orders = data?.order_requests || [];
    return orders.filter((order) => {
      if (order.order_items.every((i) => i.status === "completed")) return false;
      if (statusFilter !== "all") {
        if (!order.order_items.some((i) => i.status === statusFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          order.table_session.table_number.toString().includes(q) ||
          (order.customer_name?.toLowerCase().includes(q) ?? false) ||
          (order.customer_phone?.includes(q) ?? false)
        );
      }
      return true;
    });
  }, [data, statusFilter, searchQuery]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getOrderPct = (order: CustomerOrderRequest) => {
    const t = order.order_items.length;
    if (!t) return 0;
    const done = order.order_items.filter((i) => i.status === "completed" || i.status === "progress").length;
    return Math.round((done / t) * 100);
  };

  const formatTime = (s: string) => {
    try {
      const d = new Date(s);
      const h = d.getHours() % 12 || 12, m = String(d.getMinutes()).padStart(2, "0");
      return `${h}:${m} ${d.getHours() >= 12 ? "PM" : "AM"}`;
    } catch { return "—"; }
  };

  // ── Status update ─────────────────────────────────────────────────────────────
  const updateStatus = async (order: CustomerOrderRequest, item: OrderItemType, newStatus: orderStatus) => {
    if (newStatus === "cancelled") {
      Alert.alert("Cancel Item", `Cancel "${item.menu_name}"?`, [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: () => doUpdate(order, item, newStatus) },
      ]);
      return;
    }
    doUpdate(order, item, newStatus);
  };

  const doUpdate = async (order: CustomerOrderRequest, item: OrderItemType, newStatus: orderStatus) => {
    setLoadingItem((prev) => ({ ...prev, [item.id]: newStatus }));
    try {
      const res = await dummyUpdateOrderStatus(order.id, item.id, newStatus);
      if (res.success) {
        Toast.show({ type: "success", text1: `${item.menu_name} → ${STATUS_CFG[newStatus].label}`, visibilityTime: 1500 });
        await refetch();
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to update", visibilityTime: 2000 });
    } finally {
      setLoadingItem((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
    }
  };

  // ── Loading / Error / Empty ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.loadingText}>Loading kitchen orders…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.center}>
        <View style={[s.stateIcon, { backgroundColor: C.redSoft }]}>
          <Ionicons name="alert-circle-outline" size={32} color={C.red} />
        </View>
        <Text style={s.stateTitle}>Something went wrong</Text>
        <Text style={s.stateMsg}>Failed to load kitchen orders.</Text>
        <TouchableOpacity onPress={() => refetch()} style={s.retryBtn} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={16} color="#fff" />
          <Text style={s.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={s.page}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Kitchen</Text>
          <TouchableOpacity
            style={[s.refreshBtn, (refreshing || isRefetching) && { opacity: 0.5 }]}
            onPress={onRefresh}
            disabled={refreshing || isRefetching}
            activeOpacity={0.75}
          >
            <Ionicons name="refresh-outline" size={18} color={C.accent} />
            <Text style={s.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* ── Progress overview ── */}
        <View style={s.overviewCard}>
          <View style={s.overviewTop}>
            <View>
              <Text style={s.overviewLabel}>Overall progress</Text>
              <Text style={s.overviewPct}>{stats.pct}%</Text>
            </View>
            <View style={s.overviewRight}>
              <Text style={s.overviewBig}>{stats.completed}</Text>
              <Text style={s.overviewBigLabel}>of {stats.total} done</Text>
            </View>
          </View>
          <View style={s.bigProgressTrack}>
            <View style={[s.bigProgressFill, { width: `${stats.pct}%` }]} />
          </View>
          <View style={s.overviewStats}>
            {[
              { label: "Pending",  value: stats.pending,    dot: C.amber },
              { label: "Approved", value: stats.approved,   dot: C.green },
              { label: "Cooking",  value: stats.inProgress, dot: C.blue  },
              { label: "Done",     value: stats.completed,  dot: C.green },
              { label: "Cancelled",value: stats.cancelled,  dot: C.red   },
            ].map((st) => (
              <View key={st.label} style={s.overviewStatItem}>
                <View style={[s.overviewDot, { backgroundColor: st.dot }]} />
                <Text style={s.overviewStatVal}>{st.value}</Text>
                <Text style={s.overviewStatLabel}>{st.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Search ── */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={C.ink3} />
          <TextInput
            style={s.searchInput}
            placeholder="Table, customer, phone…"
            placeholderTextColor={C.ink3}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={C.ink3} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[s.chip, statusFilter === f.value && s.chipActive]}
              onPress={() => setStatusFilter(f.value)}
              activeOpacity={0.75}
            >
              <Text style={[s.chipText, statusFilter === f.value && s.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Order list ── */}
      <ScrollView
        style={s.list}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      
      >
        {filteredOrders.length === 0 ? (
          <View style={s.emptyState}>
            <View style={[s.stateIcon, { backgroundColor: C.graySoft }]}>
              <Ionicons name="restaurant-outline" size={32} color={C.ink3} />
            </View>
            <Text style={s.stateTitle}>No active orders</Text>
            <Text style={s.stateMsg}>
              {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "All orders are completed"}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrders[order.id] ?? false;
            const pct = getOrderPct(order);
            const pendingCt = order.order_items.filter((i) => i.status === "not-approved" || i.status === "approved").length;
            const cookingCt = order.order_items.filter((i) => i.status === "progress").length;
            const doneCt    = order.order_items.filter((i) => i.status === "completed").length;

            return (
              <View key={order.id} style={s.card}>
                {/* ── Card header (always visible) ── */}
                <TouchableOpacity
                  style={s.cardHeader}
                  onPress={() => setExpandedOrders((p) => ({ ...p, [order.id]: !p[order.id] }))}
                  activeOpacity={0.8}
                >
                  <View style={s.tableTag}>
                    <Text style={s.tableTagSup}>TABLE</Text>
                    <Text style={s.tableTagNum}>{order.table_session.table_number}</Text>
                  </View>

                  <View style={s.cardHeaderMid}>
                    {order.customer_name ? (
                      <Text style={s.cardCustomer} numberOfLines={1}>{order.customer_name}</Text>
                    ) : (
                      <Text style={s.cardCustomerMuted}>Guest</Text>
                    )}
                    <View style={s.cardHeaderMeta}>
                      <MiniProgressBar pct={pct} />
                      <Text style={s.cardPct}>{pct}%</Text>
                    </View>
                    <View style={s.cardMiniStats}>
                      {pendingCt > 0 && <View style={s.miniStat}><View style={[s.miniDot, { backgroundColor: C.amber }]} /><Text style={s.miniStatText}>{pendingCt} pending</Text></View>}
                      {cookingCt > 0 && <View style={s.miniStat}><View style={[s.miniDot, { backgroundColor: C.blue }]} /><Text style={s.miniStatText}>{cookingCt} cooking</Text></View>}
                      {doneCt > 0   && <View style={s.miniStat}><View style={[s.miniDot, { backgroundColor: C.green }]} /><Text style={s.miniStatText}>{doneCt} done</Text></View>}
                    </View>
                  </View>

                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={C.ink3} />
                </TouchableOpacity>

                {/* ── Expanded content ── */}
                {isExpanded && (
                  <View style={s.cardBody}>
                    {/* Customer info strip */}
                    {(order.customer_phone || order.note) && (
                      <View style={s.customerStrip}>
                        {order.customer_phone && (
                          <View style={s.stripRow}>
                            <Ionicons name="call-outline" size={13} color={C.accent} />
                            <Text style={s.stripText}>{order.customer_phone}</Text>
                          </View>
                        )}
                        {order.note && (
                          <View style={s.stripRow}>
                            <Ionicons name="chatbubble-outline" size={13} color={C.accent} />
                            <Text style={s.stripNote} numberOfLines={2}>{order.note}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Items */}
                    <Text style={s.itemsHeading}>Items · {order.order_items.length}</Text>

                    {order.order_items.map((item, idx) => {
                      const loadingAction = loadingItem[item.id] ?? null; // which action is loading for THIS item
                      const isCancelled  = item.status === "cancelled";
                      const isCompleted  = item.status === "completed";

                      return (
                        <View key={item.id} style={[s.itemCard, idx > 0 && { marginTop: 10 }]}>
                          {/* Item name row */}
                          <View style={s.itemTopRow}>
                            <View style={s.itemNameBlock}>
                              <Text style={s.itemName} numberOfLines={1}>{item.menu_name}</Text>
                              <View style={s.itemMeta}>
                                <Text style={s.itemQty}>×{item.quantity}</Text>
                                <Text style={s.itemDot}>·</Text>
                                <Text style={s.itemPrice}>₹{item.price}</Text>
                                <Text style={s.itemDot}>·</Text>
                                <Text style={s.itemTotal}>₹{(item.price * item.quantity).toLocaleString("en-IN")}</Text>
                              </View>
                            </View>
                            <StatusBadge status={item.status} highlighted />
                          </View>

                          {/* Action buttons — only show if not terminal */}
                          {!isCompleted && !isCancelled && (
                            <View style={s.actionRow}>
                              {/* → Progress */}
                              <StatusActionButton
                                label="Cooking"
                                icon="cafe"
                                bg={C.blueSoft}
                                textColor={C.blue}
                                active={item.status === "progress"}
                                loading={loadingAction === "progress"}
                                disabled={item.status === "progress" || !!loadingAction}
                                onPress={() => updateStatus(order, item, "progress")}
                              />
                              {/* → Complete */}
                              <StatusActionButton
                                label="Done"
                                icon="checkmark-circle"
                                bg={C.greenSoft}
                                textColor={C.green}
                                active={false}
                                loading={loadingAction === "completed"}
                                disabled={!!loadingAction}
                                onPress={() => updateStatus(order, item, "completed")}
                              />
                              {/* → Cancel */}
                              <StatusActionButton
                                label="Cancel"
                                icon="close-circle-outline"
                                bg={C.redSoft}
                                textColor={C.red}
                                active={false}
                                loading={loadingAction === "cancelled"}
                                disabled={!!loadingAction}
                                onPress={() => updateStatus(order, item, "cancelled")}
                              />
                            </View>
                          )}

                          {/* Terminal state banner */}
                          {(isCompleted || isCancelled) && (
                            <View style={[s.terminalBanner, { backgroundColor: isCompleted ? C.greenSoft : C.redSoft }]}>
                              <Ionicons
                                name={isCompleted ? "checkmark-done-circle" : "close-circle"}
                                size={14}
                                color={isCompleted ? C.green : C.red}
                              />
                              <Text style={[s.terminalText, { color: isCompleted ? C.green : C.red }]}>
                                {isCompleted ? "This item is completed" : "This item was cancelled"}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}

                    {/* Footer */}
                    <View style={s.cardFooter}>
                      <Ionicons name="time-outline" size={13} color={C.ink3} />
                      <Text style={s.cardFooterText}>Opened {formatTime(order.table_session.open_time)}</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={s.orderId}>#{order.id.slice(0, 8)}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:   { flex: 1, backgroundColor: C.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.surface, padding: 24 },

  loadingText: { marginTop: 14, color: C.ink3, fontSize: 15 },
  stateIcon:   { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  stateTitle:  { fontSize: 18, fontWeight: "600", color: C.ink, marginBottom: 6 },
  stateMsg:    { fontSize: 14, color: C.ink3, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  retryBtn:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999 },
  retryText:   { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Header
  header:       { backgroundColor: C.card, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: C.divider },
  headerRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  headerTitle:  { fontSize: 24, fontWeight: "700", color: C.ink, letterSpacing: -0.5 },
  refreshBtn:   { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.accentSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.accentMid },
  refreshBtnText:{ fontSize: 12, color: C.accent, fontWeight: "600" },

  // Overview card
  overviewCard:     { backgroundColor: C.graySoft, borderRadius: 14, padding: 14, marginBottom: 14 },
  overviewTop:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  overviewLabel:    { fontSize: 11, color: C.ink3, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  overviewPct:      { fontSize: 28, fontWeight: "700", color: C.accent, letterSpacing: -1 },
  overviewRight:    { alignItems: "flex-end" },
  overviewBig:      { fontSize: 24, fontWeight: "700", color: C.ink },
  overviewBigLabel: { fontSize: 12, color: C.ink3 },
  bigProgressTrack: { height: 6, backgroundColor: C.divider, borderRadius: 3, overflow: "hidden", marginBottom: 12 },
  bigProgressFill:  { height: "100%", backgroundColor: C.accent, borderRadius: 3 },
  overviewStats:    { flexDirection: "row", justifyContent: "space-between" },
  overviewStatItem: { alignItems: "center", gap: 3 },
  overviewDot:      { width: 7, height: 7, borderRadius: 4 },
  overviewStatVal:  { fontSize: 15, fontWeight: "700", color: C.ink },
  overviewStatLabel:{ fontSize: 10, color: C.ink3 },

  // Search
  searchBox:   { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.graySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10, borderWidth: 1, borderColor: C.divider },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, padding: 0 },

  // Chips
  chipScroll:    { marginBottom: 4 },
  chip:          { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.graySoft, borderRadius: 999 },
  chipActive:    { backgroundColor: C.accent },
  chipText:      { fontSize: 12, color: C.ink2, fontWeight: "500" },
  chipTextActive:{ color: "#fff", fontWeight: "600" },

  // List
  list:        { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 14 },

  // Empty
  emptyState: { alignItems: "center", paddingTop: 60 },

  // Card
  card:       { backgroundColor: C.card, borderRadius: 16, marginBottom: 14, borderWidth: 1.5, borderColor: C.divider, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  tableTag:   { width: 52, height: 52, backgroundColor: C.accentSoft, borderRadius: 12, borderWidth: 1.5, borderColor: C.accentMid, alignItems: "center", justifyContent: "center" },
  tableTagSup:{ fontSize: 8, fontWeight: "700", color: C.accent, letterSpacing: 1 },
  tableTagNum:{ fontSize: 20, fontWeight: "700", color: C.accent, marginTop: -2 },
  cardHeaderMid:   { flex: 1 },
  cardCustomer:    { fontSize: 15, fontWeight: "600", color: C.ink, marginBottom: 4 },
  cardCustomerMuted:{ fontSize: 15, color: C.ink3, marginBottom: 4 },
  cardHeaderMeta:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  cardPct:         { fontSize: 12, fontWeight: "600", color: C.accent, minWidth: 32 },
  cardMiniStats:   { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  miniStat:        { flexDirection: "row", alignItems: "center", gap: 4 },
  miniDot:         { width: 6, height: 6, borderRadius: 3 },
  miniStatText:    { fontSize: 11, color: C.ink3 },

  // Card body
  cardBody:      { borderTopWidth: 1, borderTopColor: C.divider, padding: 14, backgroundColor: "#fdfcfb" },
  customerStrip: { backgroundColor: C.accentSoft, borderRadius: 10, padding: 10, marginBottom: 14, gap: 6 },
  stripRow:      { flexDirection: "row", alignItems: "center", gap: 7 },
  stripText:     { fontSize: 13, color: C.ink2 },
  stripNote:     { fontSize: 12, color: C.ink2, fontStyle: "italic", flex: 1 },
  itemsHeading:  { fontSize: 12, fontWeight: "700", color: C.ink3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },

  // Item card
  itemCard:    { backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.divider },
  itemTopRow:  { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  itemNameBlock:{ flex: 1, marginRight: 10 },
  itemName:    { fontSize: 14, fontWeight: "600", color: C.ink, marginBottom: 4 },
  itemMeta:    { flexDirection: "row", alignItems: "center", gap: 5 },
  itemQty:     { fontSize: 12, color: C.ink3 },
  itemDot:     { fontSize: 12, color: C.divider },
  itemPrice:   { fontSize: 12, color: C.ink3 },
  itemTotal:   { fontSize: 12, fontWeight: "600", color: C.accent },
  actionRow:   { flexDirection: "row", gap: 8 },
  terminalBanner:{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, padding: 8, borderRadius: 8 },
  terminalText:  { fontSize: 12, fontWeight: "500" },

  // Card footer
  cardFooter:     { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.divider },
  cardFooterText: { fontSize: 11, color: C.ink3 },
  orderId:        { fontSize: 10, color: C.ink3, fontFamily: "monospace" },
});