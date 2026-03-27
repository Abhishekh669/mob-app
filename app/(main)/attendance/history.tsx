import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGetAttendanceLeaveHistoryByUserId } from '@/hooks/tanstack/query-hook/attendance/use-get-attendance-leave-by-user-id';
import {
  AttendanceLeaveQuery,
  LeaveStatus,
  AttendanceLeaveResponse,
  AttendanceLeaveByUserStats,
} from '@/utils/types/attendance/attendance.types';
import DateTimePicker from '@react-native-community/datetimepicker';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  accent:     '#e8622a',
  accentSoft: '#fff3ee',
  accentMid:  '#fde0d2',
  ink:        '#1a1410',
  ink2:       '#5c4f43',
  ink3:       '#9c8d82',
  surface:    '#fffcf8',
  card:       '#ffffff',
  divider:    '#f0ebe4',
  graySoft:   '#f5f4f2',
  green:      '#1a8f5c',
  greenSoft:  '#e8f7f0',
  red:        '#c0392b',
  redSoft:    '#fef2f1',
  amber:      '#b45309',
  amberSoft:  '#fef9ee',
  blue:       '#1d4ed8',
  blueSoft:   '#eff6ff',
};

const ITEMS_PER_PAGE = 10;

type ActiveFilters = Required<Pick<AttendanceLeaveQuery, 'limit' | 'page'>> &
  Omit<AttendanceLeaveQuery, 'limit' | 'page'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const statusConfig = (status: LeaveStatus) => {
  switch (status) {
    case 'approved': return { bg: C.greenSoft, text: C.green, dot: C.green,  label: 'APPROVED' };
    case 'rejected': return { bg: C.redSoft,   text: C.red,   dot: C.red,   label: 'REJECTED'  };
    case 'pending':  return { bg: C.amberSoft, text: C.amber, dot: C.amber, label: 'PENDING'   };
    default:         return { bg: C.graySoft,  text: C.ink3,  dot: C.ink3,  label: 'UNKNOWN'   };
  }
};

const getVisiblePages = (current: number, total: number): number[] => {
  const pages: number[] = [];
  const win   = 1;
  const start = Math.max(1, current - win);
  const end   = Math.min(total, current + win);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
};

// ─── Filter chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={chip.wrap}>
      <Text style={chip.label}>{label}</Text>
      <TouchableOpacity onPress={onRemove} activeOpacity={0.7} style={chip.close}>
        <Ionicons name="close" size={11} color={C.accent} />
      </TouchableOpacity>
    </View>
  );
}
const chip = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accentSoft, borderRadius: 999, borderWidth: 1, borderColor: C.accentMid, paddingLeft: 10, paddingRight: 5, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '600', color: C.accent },
  close: { width: 17, height: 17, borderRadius: 9, backgroundColor: C.accentMid, alignItems: 'center', justifyContent: 'center' },
});

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: AttendanceLeaveByUserStats }) {
  const items = [
    { value: stats.total_requests,    label: 'Total',    color: C.ink   },
    { value: stats.pending_requests,  label: 'Pending',  color: C.amber },
    { value: stats.approved_requests, label: 'Approved', color: C.green },
    { value: stats.rejected_requests, label: 'Rejected', color: C.red   },
  ];
  return (
    <View style={sb.wrap}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <View style={sb.sep} />}
          <View style={sb.box}>
            <Text style={[sb.number, { color: item.color }]}>{item.value}</Text>
            <Text style={sb.label}>{item.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}
const sb = StyleSheet.create({
  wrap:   { flexDirection: 'row', backgroundColor: C.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1.5, borderColor: C.divider, paddingVertical: 14 },
  box:    { flex: 1, alignItems: 'center', gap: 3 },
  number: { fontSize: 22, fontWeight: '700' },
  label:  { fontSize: 11, fontWeight: '600', color: C.ink3, letterSpacing: 0.4 },
  sep:    { width: 1, backgroundColor: C.divider },
});

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  isLoading,
  onPageChange,
}: {
  currentPage:  number;
  totalPages:   number;
  totalItems:   number;
  pageSize:     number;
  isLoading:    boolean;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages(currentPage, totalPages);
  const isFirst      = currentPage === 1;
  const isLast       = currentPage === totalPages;
  const startItem    = (currentPage - 1) * pageSize + 1;
  const endItem      = Math.min(currentPage * pageSize, totalItems);

  return (
    <View style={pg.wrap}>
      {/* Info */}
      <Text style={pg.info}>
        {'Showing '}
        <Text style={pg.strong}>{startItem}–{endItem}</Text>
        {' of '}
        <Text style={pg.strong}>{totalItems}</Text>
        {' requests'}
      </Text>

      {/* Controls */}
      <View style={pg.row}>
        {/* Prev */}
        <TouchableOpacity
          style={[pg.navBtn, (isFirst || isLoading) && pg.disabled]}
          onPress={() => onPageChange(currentPage - 1)}
          disabled={isFirst || isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={16} color={isFirst ? C.ink3 : C.ink2} />
        </TouchableOpacity>

        {/* Leading ellipsis */}
        {visiblePages[0] > 1 && (
          <>
            <TouchableOpacity style={pg.pageBtn} onPress={() => onPageChange(1)} activeOpacity={0.7}>
              <Text style={pg.pageTxt}>1</Text>
            </TouchableOpacity>
            {visiblePages[0] > 2 && (
              <View style={pg.ellipsis}><Text style={pg.ellipsisTxt}>···</Text></View>
            )}
          </>
        )}

        {/* Numbered pages */}
        {visiblePages.map(page => {
          const active = page === currentPage;
          return (
            <TouchableOpacity
              key={`page-${page}`}
              style={[pg.pageBtn, active && pg.pageBtnActive]}
              onPress={() => onPageChange(page)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={[pg.pageTxt, active && pg.pageTxtActive]}>{page}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Trailing ellipsis */}
        {visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <View style={pg.ellipsis}><Text style={pg.ellipsisTxt}>···</Text></View>
            )}
            <TouchableOpacity style={pg.pageBtn} onPress={() => onPageChange(totalPages)} activeOpacity={0.7}>
              <Text style={pg.pageTxt}>{totalPages}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Next */}
        <TouchableOpacity
          style={[pg.navBtn, (isLast || isLoading) && pg.disabled]}
          onPress={() => onPageChange(currentPage + 1)}
          disabled={isLast || isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={16} color={isLast ? C.ink3 : C.ink2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
const pg = StyleSheet.create({
  wrap:         { backgroundColor: C.card, marginHorizontal: 16, marginTop: 4, marginBottom: 16, borderRadius: 14, borderWidth: 1.5, borderColor: C.divider, paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  info:         { fontSize: 12, color: C.ink3, textAlign: 'center' },
  strong:       { fontWeight: '700', color: C.ink2 },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  navBtn:       { width: 34, height: 34, borderRadius: 10, backgroundColor: C.graySoft, borderWidth: 1, borderColor: C.divider, alignItems: 'center', justifyContent: 'center' },
  disabled:     { opacity: 0.35 },
  pageBtn:      { minWidth: 34, height: 34, paddingHorizontal: 6, borderRadius: 10, backgroundColor: C.graySoft, borderWidth: 1, borderColor: C.divider, alignItems: 'center', justifyContent: 'center' },
  pageBtnActive:{ backgroundColor: C.accent, borderColor: C.accent },
  pageTxt:      { fontSize: 13, fontWeight: '600', color: C.ink2 },
  pageTxtActive:{ color: '#fff' },
  ellipsis:     { width: 24, alignItems: 'center', justifyContent: 'center' },
  ellipsisTxt:  { fontSize: 13, color: C.ink3, letterSpacing: 1 },
});

// ─── Leave card ───────────────────────────────────────────────────────────────
function LeaveCard({ item }: { item: AttendanceLeaveResponse }) {
  const sc   = statusConfig(item.status);
  const days = Math.round(
    (new Date(item.end_date).getTime() - new Date(item.start_date).getTime()) / 86400000
  ) + 1;

  // Create a unique key using id and timestamp to ensure uniqueness
  const uniqueKey = `${item.id}-${item.updated_at}`;

  return (
    <View key={uniqueKey} style={lc.wrap}>
      <View style={lc.header}>
        <View style={lc.nameRow}>
          <View style={lc.avatar}>
            <Text style={lc.avatarText}>{item.employee_name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={lc.name}>{item.employee_name}</Text>
            <Text style={lc.idText}>#{item.id.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>
        <View style={[lc.badge, { backgroundColor: sc.bg }]}>
          <View style={[lc.dot, { backgroundColor: sc.dot }]} />
          <Text style={[lc.badgeText, { color: sc.text }]}>{sc.label}</Text>
        </View>
      </View>

      <View style={lc.divider} />

      <View style={lc.dateRow}>
        <View style={lc.dateBox}>
          <Text style={lc.dateLabel}>FROM</Text>
          <Text style={lc.dateVal}>{formatDate(item.start_date)}</Text>
        </View>
        <View style={lc.arrow}>
          <Ionicons name="arrow-forward" size={13} color={C.ink3} />
        </View>
        <View style={[lc.dateBox, { alignItems: 'flex-end' }]}>
          <Text style={lc.dateLabel}>TO</Text>
          <Text style={lc.dateVal}>{formatDate(item.end_date)}</Text>
        </View>
      </View>

      <View style={[lc.strip, { backgroundColor: C.accentSoft, borderColor: C.accentMid }]}>
        <Ionicons name="time-outline" size={13} color={C.accent} />
        <Text style={[lc.stripText, { color: C.accent }]}>
          {days} day{days !== 1 ? 's' : ''} of leave
        </Text>
      </View>

      {item.message ? (
        <View style={lc.msgBox}>
          <Text style={lc.msgLabel}>REASON</Text>
          <Text style={lc.msgText}>{item.message}</Text>
        </View>
      ) : null}

      {item.supervisor_message != null && (
        <View style={[lc.msgBox, { backgroundColor: C.blueSoft, borderColor: '#bfdbfe', marginTop: 8 }]}>
          <Text style={[lc.msgLabel, { color: C.blue }]}>SUPERVISOR NOTE</Text>
          <Text style={[lc.msgText, { color: C.blue }]}>{item.supervisor_message}</Text>
        </View>
      )}

      <Text style={lc.created}>Requested {formatDate(item.created_at)}</Text>
    </View>
  );
}
const lc = StyleSheet.create({
  wrap:       { backgroundColor: C.card, borderRadius: 16, marginBottom: 12, borderWidth: 1.5, borderColor: C.divider, padding: 16 },
  header:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar:     { width: 40, height: 40, borderRadius: 12, backgroundColor: C.accentSoft, borderWidth: 1.5, borderColor: C.accentMid, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: C.accent },
  name:       { fontSize: 14, fontWeight: '700', color: C.ink },
  idText:     { fontSize: 10, color: C.ink3, fontFamily: 'monospace', marginTop: 2 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  badgeText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  divider:    { height: 1, backgroundColor: C.divider, marginBottom: 14 },
  dateRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateBox:    { flex: 1 },
  dateLabel:  { fontSize: 10, fontWeight: '700', color: C.ink3, letterSpacing: 0.8, marginBottom: 3 },
  dateVal:    { fontSize: 13, fontWeight: '600', color: C.ink },
  arrow:      { paddingHorizontal: 8 },
  strip:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  stripText:  { fontSize: 12, fontWeight: '600' },
  msgBox:     { backgroundColor: C.graySoft, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.divider },
  msgLabel:   { fontSize: 10, fontWeight: '700', color: C.ink3, letterSpacing: 0.8, marginBottom: 5 },
  msgText:    { fontSize: 13, color: C.ink2, lineHeight: 19 },
  created:    { fontSize: 10, color: C.ink3, marginTop: 10 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
const AttendanceLeaveHistory: React.FC = () => {
  const [filters, setFilters] = useState<ActiveFilters>({
    limit: ITEMS_PER_PAGE, page: 1,
    status: undefined, fromDate: undefined, toDate: undefined,
  });
  const [modalVisible,       setModalVisible]      = useState(false);
  const [tempFilters,        setTempFilters]        = useState<AttendanceLeaveQuery>({});
  const [stats,              setStats]              = useState<AttendanceLeaveByUserStats | null>(null);
  const [totalItems,         setTotalItems]         = useState(0);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker,   setShowToDatePicker]   = useState(false);

  const listRef = useRef<FlatList>(null);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useGetAttendanceLeaveHistoryByUserId(filters);

  useEffect(() => {
    if (!data?.attendance_leave_data) return;
    const response = data.attendance_leave_data;
    setStats(response.stats);
    setTotalItems(response.stats?.total_requests ?? 0);
  }, [data]);

  useEffect(() => {
    if (isError && error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to fetch attendance leave history',
        [{ text: 'Retry', onPress: () => refetch() }]
      );
    }
  }, [isError, error, refetch]);

  // Deduplicate requests based on ID to prevent duplicate keys
  const uniqueRequests = useMemo(() => {
    if (!data?.attendance_leave_data?.requests) return [];
    const seen = new Set<string>();
    return data.attendance_leave_data.requests.filter(request => {
      if (seen.has(request.id)) {
        console.warn(`Duplicate request ID found: ${request.id}`);
        return false;
      }
      seen.add(request.id);
      return true;
    });
  }, [data]);

  // ─── Page navigation ──────────────────────────────────────────────────────
  const goToPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const refresh = useCallback(() => {
    setFilters(prev => ({ ...prev, page: 1 }));
  }, []);

  const applyFilters = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      status:   tempFilters.status,
      fromDate: tempFilters.fromDate,
      toDate:   tempFilters.toDate,
      page:     1,
    }));
    setModalVisible(false);
  }, [tempFilters]);

  const resetFilters = useCallback(() => {
    setTempFilters({});
    setFilters({ limit: ITEMS_PER_PAGE, page: 1, status: undefined, fromDate: undefined, toDate: undefined });
    setModalVisible(false);
  }, []);

  const removeStatusFilter   = useCallback(() => setFilters(p => ({ ...p, status: undefined,   page: 1 })), []);
  const removeFromDateFilter = useCallback(() => setFilters(p => ({ ...p, fromDate: undefined,  page: 1 })), []);
  const removeToDateFilter   = useCallback(() => setFilters(p => ({ ...p, toDate: undefined,    page: 1 })), []);

  const activeFilterCount = [filters.status, filters.fromDate, filters.toDate].filter(Boolean).length;
  const hasActiveFilters  = activeFilterCount > 0;
  const totalPages        = totalItems ? Math.ceil(totalItems / ITEMS_PER_PAGE) : 1;
  const isInitialLoad     = isLoading && filters.page === 1 && uniqueRequests.length === 0;

  // ─── Sub-renders ──────────────────────────────────────────────────────────
  const renderListHeader = () => (
    <>
      {hasActiveFilters && (
        <View style={m.chipsRow}>
          {filters.status && (
            <FilterChip label={filters.status.toUpperCase()} onRemove={removeStatusFilter} />
          )}
          {filters.fromDate && (
            <FilterChip label={`From: ${formatDate(filters.fromDate)}`} onRemove={removeFromDateFilter} />
          )}
          {filters.toDate && (
            <FilterChip label={`To: ${formatDate(filters.toDate)}`} onRemove={removeToDateFilter} />
          )}
        </View>
      )}
      {stats && <StatsBar stats={stats} />}
    </>
  );

  const renderListFooter = () => (
    <Pagination
      currentPage={filters.page}
      totalPages={totalPages}
      totalItems={totalItems}
      pageSize={ITEMS_PER_PAGE}
      isLoading={isFetching}
      onPageChange={goToPage}
    />
  );

  const renderEmpty = () => (
    <View style={m.empty}>
      <View style={[m.emptyIcon, { backgroundColor: C.accentSoft }]}>
        <Ionicons name="calendar-outline" size={28} color={C.accent} />
      </View>
      <Text style={m.emptyTitle}>No leave requests found</Text>
      <Text style={m.emptyMsg}>
        {hasActiveFilters ? 'Try adjusting or clearing your filters.' : 'Pull down to refresh.'}
      </Text>
      {hasActiveFilters && (
        <TouchableOpacity style={m.clearBtn} onPress={resetFilters} activeOpacity={0.8}>
          <Text style={m.clearBtnText}>Clear filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={mo.overlay}>
        <View style={mo.sheet}>
          <View style={mo.handle} />

          <View style={mo.titleRow}>
            <Text style={mo.title}>Filter requests</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={mo.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close-outline" size={20} color={C.ink3} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status */}
            <Text style={mo.fieldLabel}>STATUS</Text>
            <View style={mo.statusRow}>
              {(['pending', 'approved', 'rejected'] as LeaveStatus[]).map(status => {
                const sc       = statusConfig(status);
                const isActive = tempFilters.status === status;
                return (
                  <TouchableOpacity
                    key={`status-${status}`}
                    style={[mo.statusChip, isActive && { backgroundColor: sc.bg, borderColor: sc.dot }]}
                    onPress={() =>
                      setTempFilters(prev => ({ ...prev, status: prev.status === status ? undefined : status }))
                    }
                    activeOpacity={0.75}
                  >
                    {isActive && <View style={[mo.chipDot, { backgroundColor: sc.dot }]} />}
                    <Text style={[mo.chipText, isActive && { color: sc.text, fontWeight: '700' }]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={12} color={sc.text} style={{ marginLeft: 2 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date range */}
            <Text style={[mo.fieldLabel, { marginTop: 20 }]}>DATE RANGE</Text>

            <TouchableOpacity style={mo.dateBtn} onPress={() => setShowFromDatePicker(true)} activeOpacity={0.75}>
              <Ionicons name="calendar-outline" size={16} color={C.ink3} />
              <Text style={[mo.dateBtnText, !tempFilters.fromDate && { color: C.ink3 }]}>
                {tempFilters.fromDate ? formatDate(tempFilters.fromDate) : 'Select start date'}
              </Text>
              {tempFilters.fromDate
                ? <TouchableOpacity onPress={() => setTempFilters(p => ({ ...p, fromDate: undefined }))} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={16} color={C.ink3} />
                  </TouchableOpacity>
                : <Ionicons name="chevron-down-outline" size={14} color={C.ink3} />
              }
            </TouchableOpacity>

            <TouchableOpacity style={[mo.dateBtn, { marginTop: 10 }]} onPress={() => setShowToDatePicker(true)} activeOpacity={0.75}>
              <Ionicons name="calendar-outline" size={16} color={C.ink3} />
              <Text style={[mo.dateBtnText, !tempFilters.toDate && { color: C.ink3 }]}>
                {tempFilters.toDate ? formatDate(tempFilters.toDate) : 'Select end date'}
              </Text>
              {tempFilters.toDate
                ? <TouchableOpacity onPress={() => setTempFilters(p => ({ ...p, toDate: undefined }))} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={16} color={C.ink3} />
                  </TouchableOpacity>
                : <Ionicons name="chevron-down-outline" size={14} color={C.ink3} />
              }
            </TouchableOpacity>

            {showFromDatePicker && (
              <DateTimePicker
                value={tempFilters.fromDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, d) => { setShowFromDatePicker(false); if (d) setTempFilters(p => ({ ...p, fromDate: d })); }}
              />
            )}
            {showToDatePicker && (
              <DateTimePicker
                value={tempFilters.toDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, d) => { setShowToDatePicker(false); if (d) setTempFilters(p => ({ ...p, toDate: d })); }}
              />
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={mo.actions}>
            <TouchableOpacity style={mo.resetBtn} onPress={resetFilters} activeOpacity={0.75}>
              <Text style={mo.resetText}>Reset all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mo.applyBtn} onPress={applyFilters} activeOpacity={0.8}>
              <Text style={mo.applyText}>Apply filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={m.page}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

      {/* ── Header ── */}
      <View style={m.header}>
        <View style={m.headerRow}>
          <Text style={m.headerTitle}>Leave History</Text>
          <TouchableOpacity
            style={[m.filterBtn, hasActiveFilters && m.filterBtnActive]}
            onPress={() => {
              setTempFilters({ status: filters.status, fromDate: filters.fromDate, toDate: filters.toDate });
              setModalVisible(true);
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="options-outline" size={15} color={hasActiveFilters ? C.accent : C.ink2} />
            <Text style={[m.filterBtnText, hasActiveFilters && { color: C.accent }]}>
              {hasActiveFilters ? `Filters (${activeFilterCount})` : 'Filter'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        ref={listRef}
        data={uniqueRequests}
        renderItem={({ item }) => <LeaveCard item={item} />}
        keyExtractor={(item, index) => {
          // Use combination of id and index to ensure uniqueness
          // This prevents duplicate key issues even if IDs are repeated
          return `${item.id}-${item.updated_at}-${index}`;
        }}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={!isInitialLoad ? renderEmpty : null}
        contentContainerStyle={m.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && filters.page === 1}
            onRefresh={refresh}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* ── Page-change loading pill ── */}
      {isFetching && !isInitialLoad && (
        <View style={m.pageLoader}>
          <ActivityIndicator size="small" color={C.accent} />
          <Text style={m.pageLoaderText}>Loading…</Text>
        </View>
      )}

      {/* ── Initial load overlay ── */}
      {isInitialLoad && (
        <View style={m.loadingOverlay}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={m.loadingText}>Loading leave requests…</Text>
        </View>
      )}

      {renderFilterModal()}
    </View>
  );
};

// ─── Main styles ──────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  page:           { flex: 1, backgroundColor: C.surface },
  header:         { backgroundColor: C.card, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: C.divider },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:    { fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  filterBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.graySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.divider },
  filterBtnActive:{ backgroundColor: C.accentSoft, borderColor: C.accentMid },
  filterBtnText:  { fontSize: 12, fontWeight: '600', color: C.ink2 },
  listContent:    { padding: 16, paddingBottom: 8 },
  chipsRow:       { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  empty:          { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyIcon:      { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle:     { fontSize: 16, fontWeight: '600', color: C.ink, marginBottom: 6 },
  emptyMsg:       { fontSize: 13, color: C.ink3, textAlign: 'center', lineHeight: 19 },
  clearBtn:       { marginTop: 16, backgroundColor: C.accentSoft, borderRadius: 999, borderWidth: 1, borderColor: C.accentMid, paddingHorizontal: 18, paddingVertical: 9 },
  clearBtnText:   { fontSize: 13, fontWeight: '600', color: C.accent },
  pageLoader:     { position: 'absolute', bottom: 100, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: C.divider },
  pageLoaderText: { fontSize: 13, color: C.ink3, fontWeight: '500' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,252,248,0.92)' },
  loadingText:    { marginTop: 14, color: C.ink3, fontSize: 15 },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────
const mo = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: '80%' },
  handle:     { width: 36, height: 4, backgroundColor: C.divider, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:      { fontSize: 18, fontWeight: '700', color: C.ink },
  closeBtn:   { width: 32, height: 32, borderRadius: 8, backgroundColor: C.graySoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.ink3, letterSpacing: 0.8, marginBottom: 10 },
  statusRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.graySoft, borderWidth: 1, borderColor: C.divider },
  chipDot:    { width: 6, height: 6, borderRadius: 3 },
  chipText:   { fontSize: 13, fontWeight: '500', color: C.ink2 },
  dateBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.graySoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: C.divider },
  dateBtnText:{ fontSize: 14, color: C.ink, fontWeight: '500', flex: 1 },
  actions:    { flexDirection: 'row', gap: 12, marginTop: 20 },
  resetBtn:   { flex: 1, paddingVertical: 13, backgroundColor: C.graySoft, borderRadius: 12, borderWidth: 1, borderColor: C.divider, alignItems: 'center' },
  resetText:  { color: C.ink2, fontSize: 15, fontWeight: '600' },
  applyBtn:   { flex: 2, paddingVertical: 13, backgroundColor: C.accent, borderRadius: 12, alignItems: 'center' },
  applyText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default AttendanceLeaveHistory;