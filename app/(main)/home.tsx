import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StatusBar,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/utils/store/user/use-user-store';
import { RemoveUserToken } from '@/utils/storage/user.auth.storage';
import { useGetTodayAttendanceByUserId } from '@/hooks/tanstack/query-hook/attendance/use-get-today-user-attendance-by-id';
import { AttendanceStat } from '@/utils/types/attendance/attendance.types';

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

// ─── Shimmer skeleton block ────────────────────────────────────────────────────
function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: C.divider, opacity }, style]}
    />
  );
}

// ─── Skeleton that mirrors the real attendance card layout ────────────────────
function AttendanceSkeleton() {
  return (
    <View style={skStyles.wrapper}>
      {/* Status row */}
      <View style={skStyles.statusRow}>
        <SkeletonBlock width={48} height={48} borderRadius={24} />
        <View style={skStyles.statusLines}>
          <SkeletonBlock width={110} height={14} borderRadius={6} />
          <SkeletonBlock width={170} height={11} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
      </View>
      {/* Time grid */}
      <View style={skStyles.timeGrid}>
        <View style={skStyles.timeCol}>
          <SkeletonBlock width={56} height={10} borderRadius={4} />
          <SkeletonBlock width={76} height={26} borderRadius={6} style={{ marginTop: 10 }} />
          <SkeletonBlock width={64} height={9} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
        <View style={skStyles.sep} />
        <View style={skStyles.timeCol}>
          <SkeletonBlock width={56} height={10} borderRadius={4} />
          <SkeletonBlock width={76} height={26} borderRadius={6} style={{ marginTop: 10 }} />
          <SkeletonBlock width={64} height={9} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

const skStyles = StyleSheet.create({
  wrapper: { gap: 14 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: C.graySoft,
    borderRadius: 12,
    gap: 12,
  },
  statusLines: { flex: 1, gap: 4 },
  timeGrid: {
    flexDirection: 'row',
    backgroundColor: C.graySoft,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.divider,
  },
  timeCol: { flex: 1, alignItems: 'center' },
  sep: { width: 1, backgroundColor: C.divider, marginHorizontal: 12 },
});

// ─── Spinning refresh icon ─────────────────────────────────────────────────────
function SpinIcon({ spinning }: { spinning: boolean }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (spinning) {
      rotation.setValue(0);
      loopRef.current = Animated.loop(
        Animated.timing(rotation, { toValue: 1, duration: 700, useNativeDriver: true })
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      rotation.setValue(0);
    }
  }, [spinning]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="refresh-outline" size={18} color={spinning ? C.accent : C.ink3} />
    </Animated.View>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { user, logout } = useUserStore();
  const {
    data: userAttendanceData,
    isLoading: isAttendanceLoading,
    isError: isAttendanceError,
    error: attendanceError,
    refetch: refetchAttendance,
  } = useGetTodayAttendanceByUserId();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleLogout = async () => {
    logout();
    await RemoveUserToken();
    router.replace('/(auth)/login');
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchAttendance();
    setIsRefreshing(false);
  }, [refetchAttendance]);

  const handleManualRefresh = async () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    await refetchAttendance();
    setIsManualRefreshing(false);
  };

  const getStatusConfig = (status: AttendanceStat) => {
    const configs: Record<string, { color: string; bg: string; icon: string; label: string }> = {
      present:  { color: C.green,  bg: C.greenSoft, icon: "checkmark-circle", label: 'Present' },
      absent:   { color: C.red,    bg: C.redSoft,   icon: "close-circle",     label: 'Absent' },
      late:     { color: C.amber,  bg: C.amberSoft, icon: "time",             label: 'Late' },
      half_day: { color: C.blue,   bg: C.blueSoft,  icon: "cafe",             label: 'Half Day' },
      leave:    { color: C.ink3,   bg: C.graySoft,  icon: "business",         label: 'On Leave' },
    };
    return configs[status] || { color: C.ink3, bg: C.graySoft, icon: "help-circle", label: status };
  };

  const formatTime = (timeString?: string | null): string => {
    if (!timeString) return '—';
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasValidAttendance = (): boolean =>
    !!(userAttendanceData && 'attendance' in userAttendanceData && userAttendanceData.attendance);

  const attendance = hasValidAttendance() ? (userAttendanceData as any).attendance : null;

  const today = new Date();
  const dayName  = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr  = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  // First-ever load (no cached data) vs. background manual refresh
  const isFirstLoad        = isAttendanceLoading && !userAttendanceData;
  const isBackgroundRefresh = isManualRefreshing;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
      <ScrollView
        style={styles.root}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[C.accent]}
            tintColor={C.accent}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greetingSmall}>Good {getGreeting()},</Text>
              <Text style={styles.greetingName} numberOfLines={1}>
                {user?.name?.split(' ')[0] || 'User'}
              </Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
              <View style={[styles.avatarBadge, { backgroundColor: C.green }]} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatItem value={user?.role || 'Member'} label="Role" />
            <View style={[styles.statDivider, { backgroundColor: C.divider }]} />
            <StatItem value={user?.gender || 'N/A'} label="Gender" />
            <View style={[styles.statDivider, { backgroundColor: C.divider }]} />
            <StatItem
              value={user?.created_at ? String(new Date(user.created_at).getFullYear()) : 'N/A'}
              label="Member Since"
            />
          </View>
        </View>

        <View style={styles.body}>
          {/* ── Profile Card ────────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: C.accentSoft }]}>
                <Ionicons name="person-outline" size={18} color={C.accent} />
              </View>
              <Text style={styles.cardTitle}>Profile Information</Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'Guest User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'No email provided'}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: C.divider }]} />

            <View style={styles.infoGrid}>
              <InfoRow icon="call-outline" label="Phone Number" value={user?.phone || 'Not provided'} />
              <InfoRow
                icon="cash-outline"
                label="Monthly Salary"
                value={user?.salary ? `Rs ${Number(user.salary).toLocaleString()}` : 'Not specified'}
              />
            </View>
          </View>

          {/* ── Attendance Card ──────────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Card header */}
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: C.accentSoft }]}>
                <Ionicons name="calendar-outline" size={18} color={C.accent} />
              </View>
              <Text style={styles.cardTitle}>Today's Attendance</Text>

              <Pressable
                onPress={handleManualRefresh}
                disabled={isManualRefreshing || isAttendanceLoading}
                style={({ pressed }) => [
                  styles.refreshBtn,
                  { backgroundColor: isBackgroundRefresh ? C.accentSoft : C.graySoft },
                  pressed && styles.refreshBtnPressed,
                ]}
              >
                <SpinIcon spinning={isBackgroundRefresh} />
              </Pressable>
            </View>

            {/* Inline "Syncing…" pill – visible only during manual refresh */}
            {isBackgroundRefresh && (
              <View style={styles.syncingPill}>
                <ActivityIndicator size="small" color={C.accent} style={{ marginRight: 6 }} />
                <Text style={styles.syncingText}>Syncing attendance…</Text>
              </View>
            )}

            {/* Date banner */}
            <View style={[styles.dateCard, { backgroundColor: C.accentSoft, borderColor: C.accentMid }]}>
              <Text style={[styles.dateDay, { color: C.accent }]}>{dayName}</Text>
              <Text style={styles.dateFull}>{dateStr}</Text>
            </View>

            {/* ── Content area ── */}
            {isFirstLoad ? (
              /* Full spinner on very first load */
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={C.accent} />
                <Text style={[styles.loadingText, { color: C.ink3 }]}>Loading attendance…</Text>
              </View>

            ) : isBackgroundRefresh ? (
              /* Skeleton while silently refreshing */
              <AttendanceSkeleton />

            ) : isAttendanceError ? (
              <View style={[styles.errorState, { backgroundColor: C.redSoft }]}>
                <Ionicons name="alert-circle-outline" size={48} color={C.red} />
                <Text style={[styles.errorTitle, { color: C.red }]}>Connection Error</Text>
                <Text style={[styles.errorMessage, { color: C.ink3 }]}>
                  {attendanceError instanceof Error
                    ? attendanceError.message
                    : 'Unable to load attendance data'}
                </Text>
                <Pressable
                  style={[styles.retryBtn, { backgroundColor: C.red }]}
                  onPress={handleManualRefresh}
                >
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </Pressable>
              </View>

            ) : !attendance ? (
              <View style={[styles.emptyState, { backgroundColor: C.blueSoft }]}>
                <Ionicons name="create-outline" size={48} color={C.blue} />
                <Text style={[styles.emptyTitle, { color: C.blue }]}>No Check-in Yet</Text>
                <Text style={[styles.emptyMessage, { color: C.ink3 }]}>
                  You haven't marked your attendance for today.
                </Text>
                <Pressable
                  style={[styles.markBtn, { backgroundColor: C.accent }]}
                  onPress={() => { /* router.push('/(attendance)/mark') */ }}
                >
                  <Text style={styles.markBtnText}>Mark Attendance →</Text>
                </Pressable>
              </View>

            ) : (
              (() => {
                const cfg = getStatusConfig(attendance.status);
                return (
                  <View style={styles.attendanceContainer}>
                    <View style={[styles.statusCard, { backgroundColor: cfg.bg, borderLeftColor: cfg.color }]}>
                      <View style={[styles.statusIcon, { backgroundColor: C.card }]}>
                        <Ionicons name={cfg.icon as any} size={24} color={cfg.color} />
                      </View>
                      <View style={styles.statusInfo}>
                        <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
                        <Text style={[styles.statusDesc, { color: C.ink3 }]}>Today's attendance status</Text>
                      </View>
                    </View>

                    <View style={[styles.timeGrid, { backgroundColor: C.graySoft, borderColor: C.divider }]}>
                      <View style={styles.timeCard}>
                        <Text style={[styles.timeLabel, { color: C.ink3 }]}>Check In</Text>
                        <Text style={[styles.timeValue, { color: C.accent }]}>
                          {formatTime(attendance.check_in_time)}
                        </Text>
                        <Text style={[styles.timeHint, { color: C.ink3 }]}>Arrival time</Text>
                      </View>
                      <View style={[styles.timeDivider, { backgroundColor: C.divider }]} />
                      <View style={styles.timeCard}>
                        <Text style={[styles.timeLabel, { color: C.ink3 }]}>Check Out</Text>
                        <Text style={[styles.timeValue, { color: C.blue }]}>
                          {formatTime(attendance.check_out_time)}
                        </Text>
                        <Text style={[styles.timeHint, { color: C.ink3 }]}>Departure time</Text>
                      </View>
                    </View>

                    {attendance.need_review && (
                      <View style={[styles.reviewCard, { backgroundColor: C.amberSoft, borderLeftColor: C.amber }]}>
                        <Ionicons name="time-outline" size={20} color={C.amber} />
                        <View style={styles.reviewContent}>
                          <Text style={[styles.reviewTitle, { color: C.amber }]}>Pending Review</Text>
                          <Text style={[styles.reviewText, { color: C.ink2 }]}>
                            Your attendance requires manager approval
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })()
            )}
          </View>

          {/* ── Logout ──────────────────────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.logoutBtn,
              { backgroundColor: C.card, borderColor: C.divider },
              pressed && styles.logoutBtnPressed,
            ]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color={C.red} />
            <Text style={[styles.logoutBtnText, { color: C.red }]}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconBg, { backgroundColor: C.accentSoft }]}>
        <Ionicons name={icon} size={18} color={C.accent} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  header: {
    backgroundColor: C.card,
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: C.divider,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingSmall: { fontSize: 13, color: C.ink3, letterSpacing: 0.5, marginBottom: 4 },
  greetingName: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.accentSoft,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: C.accentMid,
    position: 'relative',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: C.accent },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: C.card,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.graySoft,
    borderRadius: 14, padding: 14,
    justifyContent: 'space-around',
    borderWidth: 1, borderColor: C.divider,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 4 },
  statLabel: { fontSize: 11, color: C.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, marginHorizontal: 8 },

  body: { padding: 16, gap: 14 },

  card: {
    backgroundColor: C.card,
    borderRadius: 16, padding: 18,
    borderWidth: 1.5, borderColor: C.divider,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  cardHeaderIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: C.ink, flex: 1 },

  refreshBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  refreshBtnPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },

  syncingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.accentSoft,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.accentMid,
  },
  syncingText: { fontSize: 12, color: C.accent, fontWeight: '500' },

  profileInfo: { marginBottom: 16 },
  profileName: { fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 4 },
  profileEmail: { fontSize: 13, color: C.ink3 },
  divider: { height: 1, marginBottom: 16 },
  infoGrid: { gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIconBg: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: C.ink3, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '500', color: C.ink },

  dateCard: {
    borderRadius: 12, padding: 14, marginBottom: 16,
    alignItems: 'center', borderWidth: 1,
  },
  dateDay: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  dateFull: { fontSize: 12, color: C.ink3 },

  loadingState: { alignItems: 'center', paddingVertical: 32 },
  loadingText: { marginTop: 12, fontSize: 13 },

  errorState: { alignItems: 'center', paddingVertical: 32, borderRadius: 12 },
  errorTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  errorMessage: { fontSize: 13, textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: C.card, fontWeight: '600', fontSize: 13 },

  emptyState: { alignItems: 'center', paddingVertical: 32, borderRadius: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  emptyMessage: { fontSize: 13, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  markBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  markBtnText: { color: C.card, fontWeight: '600', fontSize: 13 },

  attendanceContainer: { gap: 14 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, borderLeftWidth: 4,
  },
  statusIcon: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  statusDesc: { fontSize: 12 },
  timeGrid: {
    flexDirection: 'row', borderRadius: 12,
    padding: 14, borderWidth: 1,
  },
  timeCard: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  timeValue: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  timeHint: { fontSize: 10 },
  timeDivider: { width: 1, marginHorizontal: 12 },
  reviewCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, borderLeftWidth: 3, gap: 10,
  },
  reviewContent: { flex: 1 },
  reviewTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  reviewText: { fontSize: 11 },

  logoutBtn: {
    flexDirection: 'row', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    justifyContent: 'center', gap: 8,
    marginTop: 6, marginBottom: 24, borderWidth: 1.5,
  },
  logoutBtnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  logoutBtnText: { fontSize: 14, fontWeight: '600' },
});