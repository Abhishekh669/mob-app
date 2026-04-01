import { useGetFetchApprovalRequests } from '@/hooks/tanstack/query-hook/approve-request/use-get-approve-request'
import { useUserStore } from '@/utils/store/user/use-user-store'
import { ApproveRequestType, TableValidation } from '@/utils/types/approval-request/approval-request.types'
import { ApproveCustomerRequest } from '@/utils/actions/approval-request/approval.post'
import React, { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { useQueryClient } from '@tanstack/react-query'
import { deleteApprovalRequest } from '@/utils/actions/approval-request/approval.delete'
import { serializableMappingCache } from 'react-native-worklets'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  accent:    '#e8622a',
  accentSoft:'#fff3ee',
  accentMid: '#fde0d2',
  ink:       '#1a1410',
  ink2:      '#5c4f43',
  ink3:      '#9c8d82',
  surface:   '#fffcf8',
  card:      '#ffffff',
  divider:   '#f0ebe4',
  graySoft:  '#f5f4f2',
  green:     '#1a8f5c',
  greenSoft: '#e8f7f0',
  red:       '#c0392b',
  redSoft:   '#fef2f1',
  amber:     '#b45309',
  amberSoft: '#fef9ee',
}

// ─── RequestCard ──────────────────────────────────────────────────────────────

function RequestCard({
  item,
  userId,
  onApproved,
  onDeleted,
}: {
  item: TableValidation
  userId: string
  onApproved: () => void
  onDeleted: () => void
}) {
  const queryClient = useQueryClient();
  const [editing,        setEditing]        = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [deleteLoading,  setDeleteLoading]  = useState(false)
  const [fields, setFields] = useState({
    table_number: String(item.table_number),
    phone:        item.phone_number,
  })

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setApproveLoading(true)
    const payload: ApproveRequestType = {
      id:           item.id,
      waiter_id:    userId,
      table_number: Number(fields.table_number),
      phone:        fields.phone,
    }
    const res = await ApproveCustomerRequest(payload)
    setApproveLoading(false)

    if (res.success) {
      Toast.show({ type: 'success', text1: `Table ${fields.table_number} approved`, visibilityTime: 1500 })
      queryClient.invalidateQueries({queryKey : ["get-approval-requests"]})
      await new Promise(resolve => setTimeout(resolve, 1000))
      setEditing(false)
      onApproved()
    } else {
      Toast.show({ type: 'error', text1: res.error ?? 'Failed to approve', visibilityTime: 2000 })
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      'Delete Request',
      `Remove table ${fields.table_number} request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true)
            const res = await deleteApprovalRequest(item.id)
            setDeleteLoading(false)

            if (res.success) {
              Toast.show({ type: 'success', text1: 'Request deleted', visibilityTime: 1500 })
              onDeleted()
            } else {
              Toast.show({ type: 'error', text1: res.error ?? 'Failed to delete', visibilityTime: 2000 })
            }
          },
        },
      ]
    )
  }

  const handleCancelEdit = () => {
    setEditing(false)
    setFields({ table_number: String(item.table_number), phone: item.phone_number })
  }

  const anyLoading = approveLoading || deleteLoading

  return (
    <View style={card.wrap}>

      {/* ── Header ── */}
      <View style={card.header}>
        {/* Table tag */}
        <View style={card.tableTag}>
          <Text style={card.tableTagSup}>TABLE</Text>
          <Text style={card.tableTagNum}>{fields.table_number}</Text>
        </View>

        <View style={card.mid}>
          {/* Pending badge */}
          <View style={card.badge}>
            <View style={card.badgeDot} />
            <Text style={card.badgeText}>PENDING</Text>
          </View>

          {/* Phone */}
          <View style={card.metaRow}>
            <Ionicons name="call-outline" size={13} color={C.accent} />
            <Text style={card.metaText}>{fields.phone}</Text>
          </View>

          {/* Time */}
          <View style={card.metaRow}>
            <Ionicons name="time-outline" size={13} color={C.ink3} />
            <Text style={card.metaTime}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {'  '}
              {new Date(item.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        {/* Delete icon — top-right */}
        <TouchableOpacity
          style={[card.deleteIconBtn, deleteLoading && { opacity: 0.4 }]}
          onPress={handleDelete}
          disabled={anyLoading}
          activeOpacity={0.7}
        >
          {deleteLoading ? (
            <ActivityIndicator size="small" color={C.red} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={C.red} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Editable fields ── */}
      {editing && (
        <View style={card.body}>
          <Text style={card.fieldLabel}>TABLE NUMBER</Text>
          <View style={card.inputBox}>
            <Ionicons name="grid-outline" size={15} color={C.ink3} />
            <TextInput
              style={card.input}
              value={fields.table_number}
              onChangeText={(v) => setFields((p) => ({ ...p, table_number: v }))}
              keyboardType="numeric"
              placeholder="Table number"
              placeholderTextColor={C.ink3}
            />
          </View>

          <Text style={[card.fieldLabel, { marginTop: 10 }]}>PHONE NUMBER</Text>
          <View style={card.inputBox}>
            <Ionicons name="call-outline" size={15} color={C.ink3} />
            <TextInput
              style={card.input}
              value={fields.phone}
              onChangeText={(v) => setFields((p) => ({ ...p, phone: v }))}
              keyboardType="phone-pad"
              placeholder="Phone number"
              placeholderTextColor={C.ink3}
            />
          </View>
        </View>
      )}

      {/* ── ID + edit link ── */}
      <View style={card.idStrip}>
        <Text style={card.idText}>#{item.id.slice(0, 8).toUpperCase()}</Text>
        {!editing && (
          <TouchableOpacity style={card.editBtn} onPress={() => setEditing(true)} activeOpacity={0.75}>
            <Ionicons name="create-outline" size={13} color={C.accent} />
            <Text style={card.editBtnText}>Edit fields</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Bottom actions ── */}
      <View style={card.actions}>
        {editing ? (
          /* When editing: Cancel edit | Save (approve) */
          <>
            <TouchableOpacity
              style={card.secondaryBtn}
              onPress={handleCancelEdit}
              disabled={anyLoading}
              activeOpacity={0.75}
            >
              <Text style={card.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[card.approveBtn, approveLoading && card.btnDisabled]}
              onPress={handleApprove}
              disabled={anyLoading}
              activeOpacity={0.8}
            >
              {approveLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={card.approveBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* Default: Delete | Approve */
          <>
            <TouchableOpacity
              style={[card.deleteBtn, deleteLoading && card.btnDisabled]}
              onPress={handleDelete}
              disabled={anyLoading}
              activeOpacity={0.75}
            >
              {deleteLoading ? (
                <ActivityIndicator color={C.red} size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={14} color={C.red} />
                  <Text style={card.deleteBtnText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[card.approveBtn, approveLoading && card.btnDisabled]}
              onPress={handleApprove}
              disabled={anyLoading}
              activeOpacity={0.8}
            >
              {approveLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={card.approveBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApprovalRequestPage() {
  const { data, isLoading, isError, refetch } = useGetFetchApprovalRequests(true)
  const { user } = useUserStore()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    try { await refetch() } finally { setRefreshing(false) }
  }

  if (!user) {
    return (
      <View style={s.center}>
        <View style={[s.stateIcon, { backgroundColor: C.redSoft }]}>
          <Ionicons name="lock-closed-outline" size={32} color={C.red} />
        </View>
        <Text style={s.stateTitle}>Not Authorized</Text>
        <Text style={s.stateMsg}>You don't have permission to view this page.</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.loadingText}>Loading requests…</Text>
      </View>
    )
  }

  if (isError) {
    return (
      <View style={s.center}>
        <View style={[s.stateIcon, { backgroundColor: C.redSoft }]}>
          <Ionicons name="alert-circle-outline" size={32} color={C.red} />
        </View>
        <Text style={s.stateTitle}>Something went wrong</Text>
        <Text style={s.stateMsg}>Failed to load approval requests.</Text>
        <TouchableOpacity onPress={() => refetch()} style={s.retryBtn} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={16} color="#fff" />
          <Text style={s.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const requests: TableValidation[] = data?.requests || []

  return (
    <View style={s.page}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Approvals</Text>
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

        {/* ── Stats strip ── */}
        <View style={s.statsStrip}>
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: C.amber }]}>{requests.length}</Text>
            <Text style={s.statLabel}>Pending Requests</Text>
          </View>
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <View style={[s.stateIcon, { backgroundColor: C.graySoft }]}>
              <Ionicons name="receipt-outline" size={32} color={C.ink3} />
            </View>
            <Text style={s.stateTitle}>No pending requests</Text>
            <Text style={s.stateMsg}>New table requests will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            userId={user.id}
            onApproved={refetch}
            onDeleted={refetch}
          />
        )}
      />
    </View>
  )
}

// ─── Card styles ──────────────────────────────────────────────────────────────
const card = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: C.divider,
    overflow: 'hidden',
  },

  header:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  tableTag:    { width: 52, height: 52, backgroundColor: C.accentSoft, borderRadius: 12, borderWidth: 1.5, borderColor: C.accentMid, alignItems: 'center', justifyContent: 'center' },
  tableTagSup: { fontSize: 8, fontWeight: '700', color: C.accent, letterSpacing: 1 },
  tableTagNum: { fontSize: 20, fontWeight: '700', color: C.accent, marginTop: -2 },

  mid: { flex: 1, gap: 5 },

  badge:    { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: C.amberSoft, marginBottom: 2 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.amber },
  badgeText:{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: C.amber },

  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: C.ink2, fontWeight: '500' },
  metaTime: { fontSize: 11, color: C.ink3 },

  // Trash icon in top-right corner
  deleteIconBtn: { padding: 4, marginTop: -2 },

  body:       { borderTopWidth: 1, borderTopColor: C.divider, backgroundColor: '#fdfcfb', padding: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  inputBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.graySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.divider },
  input:      { flex: 1, fontSize: 14, color: C.ink, padding: 0 },

  idStrip:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10 },
  idText:      { fontSize: 10, color: C.ink3, fontFamily: 'monospace' },
  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 12, color: C.accent, fontWeight: '600' },

  actions:     { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  btnDisabled: { opacity: 0.5 },

  // Outlined red delete button
  deleteBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: C.red, backgroundColor: C.redSoft },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: C.red },

  // Filled orange approve button
  approveBtn:     { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.accent, borderRadius: 10, paddingVertical: 11 },
  approveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Neutral cancel (used when editing)
  secondaryBtn:     { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: C.divider, backgroundColor: C.graySoft },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: C.ink3 },
})

// ─── Page styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:   { flex: 1, backgroundColor: C.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.surface, padding: 24 },

  loadingText: { marginTop: 14, color: C.ink3, fontSize: 15 },
  stateIcon:   { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  stateTitle:  { fontSize: 18, fontWeight: '600', color: C.ink, marginBottom: 6 },
  stateMsg:    { fontSize: 14, color: C.ink3, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  retryBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999 },
  retryText:   { color: '#fff', fontWeight: '600', fontSize: 14 },

  header:         { backgroundColor: C.card, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: C.divider },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle:    { fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  refreshBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accentSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.accentMid },
  refreshBtnText: { fontSize: 12, color: C.accent, fontWeight: '600' },

  statsStrip: { backgroundColor: C.amberSoft, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#f5e1b8' },
  statItem:   { alignItems: 'center' },
  statVal:    { fontSize: 26, fontWeight: '700' },
  statLabel:  { fontSize: 12, color: C.ink3, marginTop: 1 },

  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },
  emptyState:  { alignItems: 'center', paddingTop: 60 },
})