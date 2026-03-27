import { useGetTodayAttendance } from "@/hooks/tanstack/query-hook/attendance/use-get-today-attendance";
import { AttendanceLeaveResponse, CreateAttendanceLeave, UpdateAttendaceRequest } from "@/utils/types/attendance/attendance.types";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import { createAttendaceLeave } from "@/utils/actions/attendance/attendance.post";
import { useUserStore } from "@/utils/store/user/use-user-store";
import { useQueryClient } from "@tanstack/react-query";
import { cancelUserAttendanceRequest, UpdateUserAttendanceRequest } from "@/utils/actions/attendance/attendance.put";
import { useRouter } from "expo-router";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  accent:     "#e8622a",
  accentSoft: "#fff3ee",
  accentMid:  "#fde0d2",
  ink:        "#1a1410",
  ink2:       "#5c4f43",
  ink3:       "#9c8d82",
  surface:    "#fffcf8",
  card:       "#ffffff",
  divider:    "#f0ebe4",
  graySoft:   "#f5f4f2",
  green:      "#1a8f5c",
  greenSoft:  "#e8f7f0",
  red:        "#c0392b",
  redSoft:    "#fef2f1",
  amber:      "#b45309",
  amberSoft:  "#fef9ee",
  blue:       "#1d4ed8",
  blueSoft:   "#eff6ff",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

const fmtShort = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const statusColor = (s: string) => {
  if (s === "approved") return { bg: C.greenSoft, text: C.green, dot: C.green };
  if (s === "rejected") return { bg: C.redSoft,   text: C.red,   dot: C.red   };
  return                       { bg: C.amberSoft, text: C.amber,  dot: C.amber };
};

// ─── EditLeaveForm ────────────────────────────────────────────────────────────
function EditLeaveForm({
  leave,
  onCancel,
  onSuccess,
}: {
  leave: AttendanceLeaveResponse;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const user    = useUserStore((s) => s.user);
  const queryClient = useQueryClient();

  const [startDate,     setStartDate]     = useState<Date>(new Date(leave.start_date));
  const [endDate,       setEndDate]       = useState<Date>(new Date(leave.end_date));
  const [message,       setMessage]       = useState(leave.message ?? "");
  const [showStartPick, setShowStartPick] = useState(false);
  const [showEndPick,   setShowEndPick]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<{
    startDate?: string;
    endDate?:   string;
    message?:   string;
  }>({});

  const days = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

  const validate = () => {
    const e: typeof errors = {};
    if (endDate < startDate)             e.endDate = "End date cannot be before start date";
    if (!message.trim())                 e.message = "Please provide a reason";
    else if (message.trim().length < 10) e.message = "Reason must be at least 10 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setLoading(true);
    const payload: UpdateAttendaceRequest = {
      id:          leave.id,
      employee_id: user.id,
      start_date:  startDate,
      end_date:    endDate,
      message:     message.trim(),
    };
    const res = await UpdateUserAttendanceRequest(payload);
    setLoading(false);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ["get-today-attendance"] });
      Toast.show({ type: "success", text1: "Leave request updated", visibilityTime: 1800 });
      onSuccess();
    } else {
      Toast.show({ type: "error", text1: res.error ?? "Failed to update", visibilityTime: 2500 });
    }
  };

  return (
    <View style={ef.wrap}>
      <View style={ef.titleRow}>
        <View style={ef.titleLeft}>
          <Ionicons name="create-outline" size={20} color={C.accent} />
          <Text style={ef.title}>Edit leave request</Text>
        </View>
        <TouchableOpacity onPress={onCancel} style={ef.closeBtn} activeOpacity={0.7} disabled={loading}>
          <Ionicons name="close-outline" size={20} color={C.ink3} />
        </TouchableOpacity>
      </View>

      <View style={ef.divider} />

      {/* Start date */}
      <Text style={ef.fieldLabel}>START DATE</Text>
      <TouchableOpacity
        style={[ef.dateBtn, errors.startDate ? ef.inputError : null]}
        onPress={() => setShowStartPick(true)}
        activeOpacity={0.75}
        disabled={loading}
      >
        <Ionicons name="calendar-outline" size={16} color={C.ink3} />
        <Text style={ef.dateBtnText}>{fmtShort(startDate)}</Text>
        <Ionicons name="chevron-down-outline" size={14} color={C.ink3} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>
      {errors.startDate ? <Text style={ef.errText}>{errors.startDate}</Text> : null}
      {showStartPick && (
        <DateTimePicker
          value={startDate}
          mode="date"
          onChange={(_, d) => {
            setShowStartPick(false);
            if (!d) return;
            setStartDate(d);
            if (endDate < d) setEndDate(d);
            setErrors((p) => ({ ...p, startDate: undefined }));
          }}
        />
      )}

      {/* End date */}
      <Text style={[ef.fieldLabel, { marginTop: 14 }]}>END DATE</Text>
      <TouchableOpacity
        style={[ef.dateBtn, errors.endDate ? ef.inputError : null]}
        onPress={() => setShowEndPick(true)}
        activeOpacity={0.75}
        disabled={loading}
      >
        <Ionicons name="calendar-outline" size={16} color={C.ink3} />
        <Text style={ef.dateBtnText}>{fmtShort(endDate)}</Text>
        <Ionicons name="chevron-down-outline" size={14} color={C.ink3} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>
      {errors.endDate ? <Text style={ef.errText}>{errors.endDate}</Text> : null}
      {showEndPick && (
        <DateTimePicker
          value={endDate}
          mode="date"
          minimumDate={startDate}
          onChange={(_, d) => {
            setShowEndPick(false);
            if (!d) return;
            setEndDate(d);
            setErrors((p) => ({ ...p, endDate: undefined }));
          }}
        />
      )}

      {/* Duration badge */}
      {days > 0 && (
        <View style={ef.durationBadge}>
          <Ionicons name="time-outline" size={13} color={C.accent} />
          <Text style={ef.durationText}>
            {days} day{days !== 1 ? "s" : ""} — {fmtShort(startDate)} to {fmtShort(endDate)}
          </Text>
        </View>
      )}

      {/* Message */}
      <Text style={[ef.fieldLabel, { marginTop: 14 }]}>REASON FOR LEAVE</Text>
      <View style={[ef.textareaBox, errors.message ? ef.inputError : null]}>
        <TextInput
          style={ef.textarea}
          value={message}
          onChangeText={(v) => {
            if (v.length <= 500) setMessage(v);
            setErrors((p) => ({ ...p, message: undefined }));
          }}
          placeholder="Describe the reason for your leave..."
          placeholderTextColor={C.ink3}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!loading}
        />
      </View>
      <View style={ef.charRow}>
        {errors.message ? <Text style={ef.errText}>{errors.message}</Text> : <Text />}
        <Text style={ef.charCount}>{message.length} / 500</Text>
      </View>

      {/* Action buttons */}
      <View style={ef.actionRow}>
        <TouchableOpacity
          style={[ef.cancelActionBtn, loading && { opacity: 0.5 }]}
          onPress={onCancel}
          activeOpacity={0.75}
          disabled={loading}
        >
          <Text style={ef.cancelActionText}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ef.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={16} color="#fff" />
              <Text style={ef.saveText}>Save changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── LeaveCard ────────────────────────────────────────────────────────────────
function LeaveCard({
  leave,
  onEdit,
  onCancelLeave,
  cancelLoading,
}: {
  leave?: AttendanceLeaveResponse;
  onEdit: () => void;
  onCancelLeave: () => void;
  cancelLoading: boolean;
}) {
  if (!leave) return null;
  const sc        = statusColor(leave.status);
  const days      = Math.round(
    (new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / 86400000
  ) + 1;
  const isPending = leave.status === "pending";

  return (
    <View style={lc.wrap}>
      <View style={lc.topRow}>
        <View style={lc.iconBox}>
          <Ionicons name="calendar-outline" size={22} color={C.accent} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={lc.label}>ACTIVE LEAVE REQUEST</Text>
          <View style={[lc.badge, { backgroundColor: sc.bg }]}>
            <View style={[lc.dot, { backgroundColor: sc.dot }]} />
            <Text style={[lc.badgeText, { color: sc.text }]}>
              {leave.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={lc.idText}>#{leave.id.slice(0, 8).toUpperCase()}</Text>
      </View>

      <View style={lc.divider} />

      <View style={lc.dateRow}>
        <View style={lc.dateBox}>
          <Text style={lc.dateLabel}>START DATE</Text>
          <Text style={lc.dateVal}>{fmt(leave.start_date)}</Text>
        </View>
        <View style={lc.arrow}>
          <Ionicons name="arrow-forward" size={14} color={C.ink3} />
        </View>
        <View style={[lc.dateBox, { alignItems: "flex-end" }]}>
          <Text style={lc.dateLabel}>END DATE</Text>
          <Text style={lc.dateVal}>{fmt(leave.end_date)}</Text>
        </View>
      </View>

      <View style={[lc.durationStrip, { backgroundColor: C.accentSoft, borderColor: C.accentMid }]}>
        <Ionicons name="time-outline" size={14} color={C.accent} />
        <Text style={[lc.durationText, { color: C.accent }]}>
          {days} day{days !== 1 ? "s" : ""} of leave
        </Text>
      </View>

      {leave.message ? (
        <View style={lc.messageBox}>
          <Text style={lc.messageLabel}>REASON</Text>
          <Text style={lc.messageText}>{leave.message}</Text>
        </View>
      ) : null}

      {leave.supervisor_message ? (
        <View style={[lc.messageBox, { backgroundColor: C.blueSoft, borderColor: "#bfdbfe", marginTop: 8 }]}>
          <Text style={[lc.messageLabel, { color: C.blue }]}>SUPERVISOR NOTE</Text>
          <Text style={[lc.messageText, { color: C.blue }]}>{leave.supervisor_message}</Text>
        </View>
      ) : null}

      {isPending && (
        <>
          <View style={lc.actionDivider} />
          <View style={lc.actionRow}>
            <TouchableOpacity
              style={[lc.editBtn, cancelLoading && { opacity: 0.5 }]}
              onPress={onEdit}
              activeOpacity={0.75}
              disabled={cancelLoading}
            >
              <Ionicons name="create-outline" size={15} color={C.accent} />
              <Text style={lc.editBtnText}>Edit request</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[lc.cancelBtn, cancelLoading && { opacity: 0.6 }]}
              onPress={onCancelLeave}
              activeOpacity={0.75}
              disabled={cancelLoading}
            >
              {cancelLoading ? (
                <ActivityIndicator size="small" color={C.red} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={15} color={C.red} />
                  <Text style={lc.cancelBtnText}>Cancel request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

// ─── CreateLeaveForm ──────────────────────────────────────────────────────────
function CreateLeaveForm({ onSuccess }: { onSuccess: () => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const user        = useUserStore((s) => s.user);
  const queryClient = useQueryClient();

  const [startDate,     setStartDate]     = useState<Date>(today);
  const [endDate,       setEndDate]       = useState<Date>(today);
  const [message,       setMessage]       = useState("");
  const [showStartPick, setShowStartPick] = useState(false);
  const [showEndPick,   setShowEndPick]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<{
    startDate?: string;
    endDate?:   string;
    message?:   string;
  }>({});

  const days = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

  const validate = () => {
    const e: typeof errors = {};
    if (startDate < today)               e.startDate = "Start date cannot be in the past";
    if (endDate < startDate)             e.endDate   = "End date cannot be before start date";
    if (!message.trim())                 e.message   = "Please provide a reason";
    else if (message.trim().length < 10) e.message   = "Reason must be at least 10 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) return;
    setLoading(true);
    const payload: CreateAttendanceLeave = {
      employee_id: user.id,
      start_date:  startDate,
      end_date:    endDate,
      message:     message.trim(),
    };
    const res = await createAttendaceLeave(payload);
    setLoading(false);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ["get-today-attendance"] });
      Toast.show({ type: "success", text1: "Leave request submitted", visibilityTime: 1800 });
      onSuccess();
    } else {
      Toast.show({ type: "error", text1: res.error ?? "Failed to submit", visibilityTime: 2500 });
    }
  };

  return (
    <View style={cf.wrap}>
      <View style={cf.titleRow}>
        <Ionicons name="add-circle-outline" size={20} color={C.accent} />
        <Text style={cf.title}>New leave request</Text>
      </View>

      <Text style={cf.fieldLabel}>START DATE</Text>
      <TouchableOpacity
        style={[cf.dateBtn, errors.startDate ? cf.inputError : null]}
        onPress={() => setShowStartPick(true)}
        activeOpacity={0.75}
        disabled={loading}
      >
        <Ionicons name="calendar-outline" size={16} color={C.ink3} />
        <Text style={cf.dateBtnText}>{fmtShort(startDate)}</Text>
        <Ionicons name="chevron-down-outline" size={14} color={C.ink3} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>
      {errors.startDate ? <Text style={cf.errText}>{errors.startDate}</Text> : null}
      {showStartPick && (
        <DateTimePicker
          value={startDate}
          mode="date"
          minimumDate={today}
          onChange={(_, d) => {
            setShowStartPick(false);
            if (!d) return;
            setStartDate(d);
            if (endDate < d) setEndDate(d);
            setErrors((p) => ({ ...p, startDate: undefined }));
          }}
        />
      )}

      <Text style={[cf.fieldLabel, { marginTop: 14 }]}>END DATE</Text>
      <TouchableOpacity
        style={[cf.dateBtn, errors.endDate ? cf.inputError : null]}
        onPress={() => setShowEndPick(true)}
        activeOpacity={0.75}
        disabled={loading}
      >
        <Ionicons name="calendar-outline" size={16} color={C.ink3} />
        <Text style={cf.dateBtnText}>{fmtShort(endDate)}</Text>
        <Ionicons name="chevron-down-outline" size={14} color={C.ink3} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>
      {errors.endDate ? <Text style={cf.errText}>{errors.endDate}</Text> : null}
      {showEndPick && (
        <DateTimePicker
          value={endDate}
          mode="date"
          minimumDate={startDate}
          onChange={(_, d) => {
            setShowEndPick(false);
            if (!d) return;
            setEndDate(d);
            setErrors((p) => ({ ...p, endDate: undefined }));
          }}
        />
      )}

      {days > 0 && (
        <View style={cf.durationBadge}>
          <Ionicons name="time-outline" size={13} color={C.accent} />
          <Text style={cf.durationText}>
            {days} day{days !== 1 ? "s" : ""} — {fmtShort(startDate)} to {fmtShort(endDate)}
          </Text>
        </View>
      )}

      <Text style={[cf.fieldLabel, { marginTop: 14 }]}>REASON FOR LEAVE</Text>
      <View style={[cf.textareaBox, errors.message ? cf.inputError : null]}>
        <TextInput
          style={cf.textarea}
          value={message}
          onChangeText={(v) => {
            if (v.length <= 500) setMessage(v);
            setErrors((p) => ({ ...p, message: undefined }));
          }}
          placeholder="Describe the reason for your leave..."
          placeholderTextColor={C.ink3}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!loading}
        />
      </View>
      <View style={cf.charRow}>
        {errors.message ? <Text style={cf.errText}>{errors.message}</Text> : <Text />}
        <Text style={cf.charCount}>{message.length} / 500</Text>
      </View>

      <TouchableOpacity
        style={[cf.submitBtn, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="paper-plane-outline" size={16} color="#fff" />
            <Text style={cf.submitText}>Submit request</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { data, isLoading, refetch } = useGetTodayAttendance();
  const queryClient                  = useQueryClient();
  const router                       = useRouter();
  const [refreshing,     setRefreshing]     = useState(false);
  const [showForm,       setShowForm]       = useState(false);
  const [isEditing,      setIsEditing]      = useState(false);
  const [cancelLoading,  setCancelLoading]  = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  const handleCancelLeave = () => {
    if (!data?.attendance) return;
    Alert.alert(
      "Cancel leave request",
      "Are you sure you want to cancel this leave request? This cannot be undone.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Yes, cancel",
          style: "destructive",
          onPress: async () => {
            setCancelLoading(true);
            const res = await cancelUserAttendanceRequest(data.attendance!.id);
            setCancelLoading(false);
            if (res.success) {
              queryClient.invalidateQueries({ queryKey: ["get-today-attendance"] });
              Toast.show({ type: "success", text1: "Leave request cancelled", visibilityTime: 1800 });
              refetch();
            } else {
              Toast.show({ type: "error", text1: res.error ?? "Failed to cancel", visibilityTime: 2500 });
            }
          },
        },
      ]
    );
  };

  const navigateToLeaveHistory = () => {
    router.push("/(main)/attendance/history");
  };

  const isAttendanceError = !data || data.status === "attendance_error" || data.success === false;
  const canCreate         = data?.success === true && data?.status === "attendance_unexist";
  const hasLeave          = data?.success === true && data?.status === "attendance_exist" && data?.attendance != null;

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.loadingText}>Loading attendance…</Text>
      </View>
    );
  }

  if (isAttendanceError) {
    return (
      <View style={s.center}>
        <View style={[s.stateIcon, { backgroundColor: C.redSoft }]}>
          <Ionicons name="alert-circle-outline" size={32} color={C.red} />
        </View>
        <Text style={s.stateTitle}>Something went wrong</Text>
        <Text style={s.stateMsg}>{data?.error ?? "Failed to load your attendance data."}</Text>
        <TouchableOpacity onPress={() => refetch()} style={s.retryBtn} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={16} color="#fff" />
          <Text style={s.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
      }
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Attendance</Text>
          <View style={s.headerActions}>
            {/* Leave History Button */}
            <TouchableOpacity
              style={s.historyBtn}
              onPress={navigateToLeaveHistory}
              activeOpacity={0.75}
            >
              <Ionicons name="time-outline" size={18} color={C.accent} />
              <Text style={s.historyBtnText}>History</Text>
            </TouchableOpacity>
            
            {/* Refresh Button */}
            <TouchableOpacity
              style={[s.refreshBtn, refreshing && { opacity: 0.5 }]}
              onPress={onRefresh}
              disabled={refreshing}
              activeOpacity={0.75}
            >
              <Ionicons name="refresh-outline" size={18} color={C.accent} />
              <Text style={s.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[
          s.statusStrip,
          {
            backgroundColor: canCreate ? C.greenSoft : hasLeave ? C.amberSoft : C.graySoft,
            borderColor:      canCreate ? "#bbf7d0"  : hasLeave ? "#f5e1b8"   : C.divider,
          },
        ]}>
          <Ionicons
            name={canCreate ? "checkmark-circle-outline" : hasLeave ? "calendar-outline" : "lock-closed-outline"}
            size={18}
            color={canCreate ? C.green : hasLeave ? C.amber : C.ink3}
          />
          <Text style={[s.statusText, { color: canCreate ? C.green : hasLeave ? C.amber : C.ink3 }]}>
            {canCreate
              ? "No attendance recorded today — you can request leave"
              : hasLeave
              ? "You have a leave request for today"
              : "Attendance already recorded for today"}
          </Text>
        </View>
      </View>

      {/* ── Leave card (view mode) ── */}
      {hasLeave && !isEditing && (
        <LeaveCard
          leave={data?.attendance}
          onEdit={() => setIsEditing(true)}
          onCancelLeave={handleCancelLeave}
          cancelLoading={cancelLoading}
        />
      )}

      {/* ── Edit form ── */}
      {hasLeave && isEditing && data?.attendance && (
        <EditLeaveForm
          leave={data.attendance}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            refetch();
          }}
        />
      )}

      {/* ── Create button ── */}
      {canCreate && !showForm && (
        <TouchableOpacity
          style={s.createBtn}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={s.createBtnText}>Request leave</Text>
        </TouchableOpacity>
      )}

      {/* ── Create form ── */}
      {canCreate && showForm && (
        <CreateLeaveForm
          onSuccess={() => {
            setShowForm(false);
            refetch();
          }}
        />
      )}
    </ScrollView>
  );
}

// ─── LeaveCard styles ─────────────────────────────────────────────────────────
const lc = StyleSheet.create({
  wrap:          { backgroundColor: C.card, borderRadius: 16, marginHorizontal: 16, marginBottom: 14, borderWidth: 1.5, borderColor: C.divider, overflow: "hidden", padding: 16 },
  topRow:        { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  iconBox:       { width: 44, height: 44, backgroundColor: C.accentSoft, borderRadius: 12, borderWidth: 1.5, borderColor: C.accentMid, alignItems: "center", justifyContent: "center" },
  label:         { fontSize: 10, fontWeight: "700", color: C.ink3, letterSpacing: 0.8 },
  badge:         { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  dot:           { width: 6, height: 6, borderRadius: 3 },
  badgeText:     { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  idText:        { fontSize: 10, color: C.ink3, fontFamily: "monospace" },
  divider:       { height: 1, backgroundColor: C.divider, marginBottom: 14 },
  dateRow:       { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dateBox:       { flex: 1 },
  dateLabel:     { fontSize: 10, fontWeight: "700", color: C.ink3, letterSpacing: 0.8, marginBottom: 4 },
  dateVal:       { fontSize: 13, fontWeight: "600", color: C.ink },
  arrow:         { paddingHorizontal: 8 },
  durationStrip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  durationText:  { fontSize: 13, fontWeight: "600" },
  messageBox:    { backgroundColor: C.graySoft, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.divider },
  messageLabel:  { fontSize: 10, fontWeight: "700", color: C.ink3, letterSpacing: 0.8, marginBottom: 6 },
  messageText:   { fontSize: 13, color: C.ink2, lineHeight: 19 },
  actionDivider: { height: 1, backgroundColor: C.divider, marginTop: 14, marginBottom: 12 },
  actionRow:     { flexDirection: "row", gap: 10 },
  editBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.accentSoft, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: C.accentMid },
  editBtnText:   { fontSize: 13, fontWeight: "600", color: C.accent },
  cancelBtn:     { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.redSoft, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: "#fecaca" },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: C.red },
});

// ─── EditLeaveForm styles ─────────────────────────────────────────────────────
const ef = StyleSheet.create({
  wrap:             { backgroundColor: C.card, borderRadius: 16, marginHorizontal: 16, marginBottom: 14, borderWidth: 1.5, borderColor: C.accentMid, padding: 16 },
  titleRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  titleLeft:        { flexDirection: "row", alignItems: "center", gap: 8 },
  title:            { fontSize: 16, fontWeight: "700", color: C.ink },
  closeBtn:         { width: 32, height: 32, borderRadius: 8, backgroundColor: C.graySoft, alignItems: "center", justifyContent: "center" },
  divider:          { height: 1, backgroundColor: C.divider, marginBottom: 16 },
  fieldLabel:       { fontSize: 11, fontWeight: "700", color: C.ink3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  dateBtn:          { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.graySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: C.divider },
  dateBtnText:      { fontSize: 14, color: C.ink, fontWeight: "500", flex: 1 },
  inputError:       { borderColor: C.red },
  errText:          { fontSize: 12, color: C.red, marginTop: 4 },
  durationBadge:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.accentSoft, borderRadius: 8, borderWidth: 1, borderColor: C.accentMid, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  durationText:     { fontSize: 13, color: C.accent, fontWeight: "500" },
  textareaBox:      { backgroundColor: C.graySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.divider, minHeight: 100 },
  textarea:         { fontSize: 14, color: C.ink, lineHeight: 20 },
  charRow:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  charCount:        { fontSize: 12, color: C.ink3, marginLeft: "auto" },
  actionRow:        { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelActionBtn:  { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 12, backgroundColor: C.graySoft, borderWidth: 1, borderColor: C.divider },
  cancelActionText: { fontSize: 14, fontWeight: "600", color: C.ink2 },
  saveBtn:          { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 13 },
  saveText:         { color: "#fff", fontSize: 15, fontWeight: "700" },
});

// ─── CreateLeaveForm styles ───────────────────────────────────────────────────
const cf = StyleSheet.create({
  wrap:          { backgroundColor: C.card, borderRadius: 16, marginHorizontal: 16, marginBottom: 14, borderWidth: 1.5, borderColor: C.divider, padding: 16 },
  titleRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  title:         { fontSize: 16, fontWeight: "700", color: C.ink },
  fieldLabel:    { fontSize: 11, fontWeight: "700", color: C.ink3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  dateBtn:       { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.graySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: C.divider },
  dateBtnText:   { fontSize: 14, color: C.ink, fontWeight: "500", flex: 1 },
  inputError:    { borderColor: C.red },
  errText:       { fontSize: 12, color: C.red, marginTop: 4 },
  durationBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.accentSoft, borderRadius: 8, borderWidth: 1, borderColor: C.accentMid, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  durationText:  { fontSize: 13, color: C.accent, fontWeight: "500" },
  textareaBox:   { backgroundColor: C.graySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.divider, minHeight: 100 },
  textarea:      { fontSize: 14, color: C.ink, lineHeight: 20 },
  charRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  charCount:     { fontSize: 12, color: C.ink3, marginLeft: "auto" },
  submitBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, marginTop: 18 },
  submitText:    { color: "#fff", fontSize: 15, fontWeight: "700" },
});

// ─── Page styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:           { flex: 1, backgroundColor: C.surface },
  content:        { paddingBottom: 40 },
  center:         { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.surface, padding: 24 },
  loadingText:    { marginTop: 14, color: C.ink3, fontSize: 15 },
  stateIcon:      { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  stateTitle:     { fontSize: 18, fontWeight: "600", color: C.ink, marginBottom: 6 },
  stateMsg:       { fontSize: 14, color: C.ink3, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  retryBtn:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999 },
  retryText:      { color: "#fff", fontWeight: "600", fontSize: 14 },
  header:         { backgroundColor: C.card, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: C.divider, marginBottom: 14 },
  headerRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  headerTitle:    { fontSize: 24, fontWeight: "700", color: C.ink, letterSpacing: -0.5 },
  headerActions:  { flexDirection: "row", gap: 8 },
  historyBtn:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.accentSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.accentMid },
  historyBtnText: { fontSize: 12, color: C.accent, fontWeight: "600" },
  refreshBtn:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.accentSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.accentMid },
  refreshBtnText: { fontSize: 12, color: C.accent, fontWeight: "600" },
  statusStrip:    { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  statusText:     { fontSize: 13, fontWeight: "500", flex: 1, lineHeight: 18 },
  createBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent, marginHorizontal: 16, borderRadius: 12, paddingVertical: 14 },
  createBtnText:  { color: "#fff", fontSize: 15, fontWeight: "700" },
});