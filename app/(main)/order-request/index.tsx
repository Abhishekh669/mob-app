import { useGetOrderRequests } from '@/hooks/tanstack/query-hook/order/use-get-order-requests'
import React, { useState, useCallback } from 'react'
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomerOrderRequest, TableSession, orderStatus } from '@/utils/types/order/order.types';

type SortOrder = 'desc' | 'asc';

// ─── Status config maps ───────────────────────────────────────────────────────
const ORDER_STATUS_CONFIG: Record<orderStatus, { label: string; bg: string; text: string; dot: string }> = {
  'approved':     { label: 'Approved',    bg: '#e8f7f0', text: '#1a8f5c', dot: '#1a8f5c' },
  'not-approved': { label: 'Pending',     bg: '#fef9ee', text: '#b45309', dot: '#e8a020' },
  'progress':     { label: 'In Progress', bg: '#eef4ff', text: '#2563b8', dot: '#2563b8' },
  'completed':    { label: 'Completed',   bg: '#e8f7f0', text: '#1a8f5c', dot: '#1a8f5c' },
  'cancelled':    { label: 'Cancelled',   bg: '#fef2f1', text: '#c0392b', dot: '#c0392b' },
};

const SESSION_STATUS_COLOR: Record<string, string> = {
  occupied: '#e8622a',
  empty:    '#1a8f5c',
  booked:   '#2563b8',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatusBadge = ({ status, size = 'md' }: { status: orderStatus; size?: 'sm' | 'md' }) => {
  const cfg = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG['not-approved'];
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }, size === 'sm' && s.badgeSm]}>
      <View style={[s.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[s.badgeText, { color: cfg.text }, size === 'sm' && s.badgeTextSm]}>
        {cfg.label}
      </Text>
    </View>
  );
};

const ItemRow = ({ item }: { item: any }) => {
  const cfg = ORDER_STATUS_CONFIG[item.status as orderStatus] || ORDER_STATUS_CONFIG['not-approved'];
  return (
    <View style={s.itemRow}>
      <View style={s.itemThumb}>
        {item.menu_image
          ? <Image source={{ uri: item.menu_image }} style={s.itemImg} resizeMode="cover" />
          : <Ionicons name="fast-food-outline" size={18} color="#9c8d82" />
        }
      </View>
      <View style={s.itemInfo}>
        <Text style={s.itemName} numberOfLines={1}>{item.menu_name || 'Unknown item'}</Text>
        <View style={s.itemMeta}>
          <View style={[s.itemStatusDot, { backgroundColor: cfg.dot }]} />
          <Text style={s.itemQty}>×{item.quantity}</Text>
          <Text style={s.itemMetaDot}>·</Text>
          <Text style={s.itemPrice}>₹{(item.price || 0).toLocaleString('en-IN')}</Text>
        </View>
      </View>
      <Text style={s.itemLineTotal}>₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</Text>
    </View>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateTime(iso: string) {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'N/A';
    const h = d.getHours() % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, '0');
    const ap = d.getHours() >= 12 ? 'PM' : 'AM';
    const mo = d.toLocaleString('default', { month: 'short' });
    return `${mo} ${d.getDate()}, ${h}:${m} ${ap}`;
  } catch { return 'N/A'; }
}

function calcTotal(orders: CustomerOrderRequest[]) {
  return orders.reduce((t, o) =>
    t + (o.order_items || []).reduce((s, i) => s + (i.price * i.quantity), 0), 0);
}

function calcItemCount(orders: CustomerOrderRequest[]) {
  return orders.reduce((t, o) => t + (o.order_items || []).length, 0);
}

// ─── Main component ───────────────────────────────────────────────────────────
function OrderRequestPage() {
  const router = useRouter();
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, isError, refetch } = useGetOrderRequests(true);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const order_requests: CustomerOrderRequest[] = data?.order_requests || [];

  const validOrders = order_requests.filter(o => o?.order_items?.length > 0 && o?.table_session?.id);

  const grouped = validOrders.reduce((acc, order) => {
    const sid = order.table_session.id;
    if (!acc[sid]) acc[sid] = { session: order.table_session, orders: [] };
    acc[sid].orders.push(order);
    return acc;
  }, {} as Record<string, { session: TableSession; orders: CustomerOrderRequest[] }>);

  const groupedList = Object.values(grouped)
    .filter(g => g?.session?.created_at)
    .sort((a, b) => {
      const da = new Date(a.session.created_at).getTime();
      const db = new Date(b.session.created_at).getTime();
      if (isNaN(da) || isNaN(db)) return 0;
      return sortOrder === 'desc' ? db - da : da - db;
    });

  const totalItems = validOrders.reduce((t, o) => t + o.order_items.length, 0);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#e8622a" />
        <Text style={s.loadingText}>Loading orders…</Text>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <View style={s.center}>
        <View style={[s.stateIcon, { backgroundColor: '#fef2f1' }]}>
          <Ionicons name="alert-circle-outline" size={32} color="#c0392b" />
        </View>
        <Text style={s.stateTitle}>Something went wrong</Text>
        <Text style={s.stateMsg}>Failed to load order requests.</Text>
        <TouchableOpacity onPress={() => refetch()} style={s.retryBtn} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={16} color="#ffffff" />
          <Text style={s.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (groupedList.length === 0) {
    return (
      <View style={s.center}>
        <View style={[s.stateIcon, { backgroundColor: '#f5f4f2' }]}>
          <Ionicons name="restaurant-outline" size={32} color="#9c8d82" />
        </View>
        <Text style={s.stateTitle}>No active orders</Text>
        <Text style={s.stateMsg}>Waiting for customers to place orders.</Text>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={s.page}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Orders</Text>
          <TouchableOpacity style={s.sortBtn} onPress={() => setSortOrder(p => p === 'desc' ? 'asc' : 'desc')} activeOpacity={0.75}>
            <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={14} color="#e8622a" />
            <Text style={s.sortBtnText}>{sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.chipRow}>
          <View style={[s.chip, { backgroundColor: '#fff3ee' }]}>
            <Text style={[s.chipText, { color: '#e8622a' }]}>{groupedList.length} tables</Text>
          </View>
          <View style={s.chip}>
            <Text style={s.chipText}>{totalItems} items</Text>
          </View>
          <View style={s.chip}>
            <Text style={s.chipText}>
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Feed ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e8622a']} tintColor="#e8622a" />}
      >
        {groupedList.map(({ session, orders }) => {
          const total = calcTotal(orders);
          const itemCount = calcItemCount(orders);
          if (itemCount === 0) return null;

          const firstStatus = orders[0]?.status || 'not-approved';
          const customerName = orders[0]?.customer_name || 'Guest';
          const customerPhone = orders[0]?.customer_phone;
          const allItems = orders.flatMap(o => o.order_items || []);
          const previewItems = allItems.slice(0, 3);
          const extraItems = allItems.length - 3;
          const sessionColor = SESSION_STATUS_COLOR[session.status] || '#9c8d82';

          return (
            <TouchableOpacity
              key={session.id}
              style={s.card}
              onPress={() => router.push(`/order-request/${session.id}`)}
              activeOpacity={0.85}
            >
              {/* Card top: table avatar + meta + item count */}
              <View style={s.cardTop}>
                <View style={s.tableAvatar}>
                  <Text style={s.tableAvatarText}>{session.table_number}</Text>
                </View>
                <View style={s.tableMeta}>
                  <View style={s.tableNameRow}>
                    <Text style={s.tableName}>Table {session.table_number}</Text>
                    <View style={[s.sessionDot, { backgroundColor: sessionColor }]} />
                  </View>
                  <View style={s.orderRefRow}>
                    <Text style={s.orderId}>#{orders[0]?.id?.slice(0, 8) || '—'}</Text>
                    <StatusBadge status={firstStatus} size="sm" />
                  </View>
                </View>
                <View style={s.itemCountPill}>
                  <Text style={s.itemCountText}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
                </View>
              </View>

              {/* Customer row */}
              <View style={s.customerRow}>
                <View style={s.customerAvatar}>
                  <Ionicons name="person-outline" size={14} color="#9c8d82" />
                </View>
                <Text style={s.customerName} numberOfLines={1}>{customerName}</Text>
                {customerPhone && (
                  <View style={s.phonePill}>
                    <Ionicons name="call-outline" size={11} color="#9c8d82" />
                    <Text style={s.phoneText}>{customerPhone}</Text>
                  </View>
                )}
              </View>

              {/* Items */}
              <View style={s.itemsSection}>
                <Text style={s.itemsSectionLabel}>Order items</Text>
                {previewItems.map((item, idx) => (
                  <React.Fragment key={item.id || `item-${idx}`}>
                    {idx > 0 && <View style={s.itemDivider} />}
                    <ItemRow item={item} />
                  </React.Fragment>
                ))}
                {extraItems > 0 && (
                  <View style={s.moreItemsBanner}>
                    <Ionicons name="ellipsis-horizontal" size={14} color="#9c8d82" />
                    <Text style={s.moreItemsText}>+{extraItems} more item{extraItems > 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={s.cardFooter}>
                <View style={s.footerLeft}>
                  <Ionicons name="time-outline" size={14} color="#9c8d82" />
                  <Text style={s.footerTime}>{formatDateTime(session.created_at)}</Text>
                </View>
                <View style={s.totalBlock}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text style={s.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Tap hint */}
              <View style={s.tapHint}>
                <Text style={s.tapHintText}>View full details</Text>
                <Ionicons name="arrow-forward" size={13} color="#e8622a" />
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ACCENT = '#e8622a';
const INK = '#1a1410';
const INK2 = '#5c4f43';
const INK3 = '#9c8d82';
const SURFACE = '#fffcf8';
const DIVIDER = '#f0ebe4';
const GRAY_SOFT = '#f5f4f2';

const s = StyleSheet.create({
  page:         { flex: 1, backgroundColor: SURFACE },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE, padding: 24 },

  // Loading / error / empty
  loadingText:  { marginTop: 14, color: INK3, fontSize: 15 },
  stateIcon:    { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  stateTitle:   { fontSize: 18, fontWeight: '600', color: INK, marginBottom: 6 },
  stateMsg:     { fontSize: 14, color: INK3, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  retryBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACCENT, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999 },
  retryText:    { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Header
  header:       { backgroundColor: '#fff', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: DIVIDER },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle:  { fontSize: 24, fontWeight: '700', color: INK, letterSpacing: -0.5 },
  sortBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff3ee', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: '#fde0d2' },
  sortBtnText:  { fontSize: 12, color: ACCENT, fontWeight: '600' },
  chipRow:      { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip:         { backgroundColor: GRAY_SOFT, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText:     { fontSize: 12, color: INK2, fontWeight: '500' },

  // Scroll
  scroll:       { flex: 1 },
  scrollContent:{ paddingHorizontal: 16, paddingTop: 14 },

  // Card
  card:         { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, borderWidth: 1.5, borderColor: DIVIDER, overflow: 'hidden' },

  // Card top
  cardTop:      { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  tableAvatar:  { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff3ee', borderWidth: 1.5, borderColor: '#fde0d2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tableAvatarText: { fontSize: 18, fontWeight: '700', color: ACCENT },
  tableMeta:    { flex: 1 },
  tableNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tableName:    { fontSize: 16, fontWeight: '700', color: INK },
  sessionDot:   { width: 8, height: 8, borderRadius: 4 },
  orderRefRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId:      { fontSize: 11, color: INK3, fontFamily: 'monospace' },
  itemCountPill:{ backgroundColor: GRAY_SOFT, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  itemCountText:{ fontSize: 12, fontWeight: '600', color: INK2 },

  // Badge
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeSm:      { paddingHorizontal: 6, paddingVertical: 2 },
  badgeDot:     { width: 5, height: 5, borderRadius: 3 },
  badgeText:    { fontSize: 11, fontWeight: '600' },
  badgeTextSm:  { fontSize: 10 },

  // Customer row
  customerRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#fdfcfb', borderBottomWidth: 1, borderBottomColor: DIVIDER, gap: 8 },
  customerAvatar:{ width: 26, height: 26, borderRadius: 13, backgroundColor: DIVIDER, justifyContent: 'center', alignItems: 'center' },
  customerName: { flex: 1, fontSize: 13, color: INK, fontWeight: '500' },
  phonePill:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GRAY_SOFT, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  phoneText:    { fontSize: 11, color: INK3 },

  // Items section
  itemsSection: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  itemsSectionLabel: { fontSize: 11, fontWeight: '700', color: INK3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  itemDivider:  { height: 1, backgroundColor: DIVIDER, marginVertical: 2 },
  itemRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  itemThumb:    { width: 36, height: 36, borderRadius: 8, backgroundColor: GRAY_SOFT, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  itemImg:      { width: '100%', height: '100%' },
  itemInfo:     { flex: 1 },
  itemName:     { fontSize: 13, fontWeight: '500', color: INK, marginBottom: 3 },
  itemMeta:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemStatusDot:{ width: 6, height: 6, borderRadius: 3 },
  itemQty:      { fontSize: 12, color: INK3 },
  itemMetaDot:  { fontSize: 12, color: DIVIDER },
  itemPrice:    { fontSize: 12, color: INK2 },
  itemLineTotal:{ fontSize: 13, fontWeight: '600', color: ACCENT },
  moreItemsBanner:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: DIVIDER, borderStyle: 'dashed' },
  moreItemsText:{ fontSize: 12, color: INK3 },

  // Footer
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: GRAY_SOFT, borderTopWidth: 1, borderTopColor: DIVIDER },
  footerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerTime:   { fontSize: 12, color: INK3 },
  totalBlock:   { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  totalLabel:   { fontSize: 12, color: INK2 },
  totalValue:   { fontSize: 18, fontWeight: '700', color: INK, letterSpacing: -0.3 },

  // Tap hint
  tapHint:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 8, backgroundColor: '#fff3ee' },
  tapHintText:  { fontSize: 11, color: ACCENT, fontWeight: '600', letterSpacing: 0.3 },
});

export default OrderRequestPage;