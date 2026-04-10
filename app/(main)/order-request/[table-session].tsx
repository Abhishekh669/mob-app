import { useGetOrderRequestsBySessionId } from '@/hooks/tanstack/query-hook/order/use-get-order-by-session-id';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomerOrderRequest, OrderItemType, orderStatus } from '@/utils/types/order/order.types';
import { approveOrder } from '@/utils/actions/order/order.post';
import { deleteTableSession } from '@/utils/actions/order/order.delete';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '@/utils/store/user/use-user-store';
import { useGetCachedMenuItems } from '@/hooks/tanstack/query-hook/customer/use-get-cached-menu-items';
import * as Crypto from 'expo-crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MenuItemsResponse {
  id: string
  category_name: string
  category_slug: string
  name: string
  description?: string | null
  price: number
  category_id: string
  is_available: boolean
  image_url?: string | null
  display_order: number
  created_at: string
  updated_at: string
}
export type CategoryMenuGroup = {
  category_name: string
  category_slug: string
  menu_items: MenuItemsResponse[]
}
export type GroupedMenuResponse = {
  [slug: string]: CategoryMenuGroup
}
export interface GroupedApiResponse {
  success: boolean;
  grouped_menu: GroupedMenuResponse
}

interface ApproveOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  has_changed: boolean;
  created_at: string;
}

export interface ApproveOrderType {
  id: string;
  table_session_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  waiter_id: string;
  note?: string | null;
  table_number: number;
  order_menu_items: ApproveOrderItem[];
  added_menu_items: ApproveOrderItem[]; // New field for newly added items
  deleted_order_items: string[]
}

interface EditedItem extends OrderItemType {
  originalQuantity: number;
  isDeleted?: boolean;
  isModified?: boolean;
  isNew?: boolean; // ← waiter-added items
}

// Synthetic EditedItem created from a MenuItemsResponse
interface WaiterAddedItem extends EditedItem {
  isNew: true;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helper function to generate UUID ────────────────────────────────────────
const generateUUID = (): string => {
  return Crypto.randomUUID();
};

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  brand: '#FF6B35',
  brandLight: '#FFF0EB',
  brandMid: '#FFD5C2',
  success: '#16A34A',
  successBg: '#DCFCE7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  info: '#2563EB',
  infoBg: '#DBEAFE',
  bg: '#F5F5F0',
  surface: '#FFFFFF',
  border: '#E8E6E0',
  text: '#1A1A1A',
  textMid: '#4B4B4B',
  textMuted: '#9A9A9A',
};

// ─── Add Menu Dialog ──────────────────────────────────────────────────────────

interface AddMenuDialogProps {
  visible: boolean;
  onClose: () => void;
  menuData: GroupedApiResponse | undefined;
  menuLoading: boolean;
  /** Already-added item IDs (to show current qty) */
  currentItems: Record<string, EditedItem>;
  onAddItem: (item: MenuItemsResponse, qty: number) => void;
}

function AddMenuDialog({
  visible,
  onClose,
  menuData,
  menuLoading,
  currentItems,
  onAddItem,
}: AddMenuDialogProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [search, setSearch] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  // Local pending quantities before confirming add
  const [pendingQty, setPendingQty] = useState<Record<string, number>>({});

  useEffect(() => {
    if (visible) {
      setSearch('');
      setSelectedSlug(null);
      setPendingQty({});
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const categories = useMemo(() => {
    if (!menuData?.grouped_menu) return [];
    return Object.values(menuData.grouped_menu).map(g => ({
      slug: g.category_slug,
      name: g.category_name,
    }));
  }, [menuData]);

  const filteredItems = useMemo(() => {
    if (!menuData?.grouped_menu) return [];
    const allItems: MenuItemsResponse[] = [];
    Object.values(menuData.grouped_menu).forEach(group => {
      if (!selectedSlug || group.category_slug === selectedSlug) {
        allItems.push(...group.menu_items);
      }
    });
    if (!search.trim()) return allItems;
    const q = search.trim().toLowerCase();
    return allItems.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.description?.toLowerCase().includes(q) ?? false)
    );
  }, [menuData, selectedSlug, search]);

  const getPendingQty = (id: string) => pendingQty[id] ?? 0;

  // Adjust quantity with step of 0.5
  const adjustQty = (id: string, delta: number) => {
    setPendingQty(prev => {
      const cur = prev[id] ?? 0;
      // Round to 1 decimal place to handle floating point precision
      let next = Math.round((cur + delta) * 10) / 10;
      // Ensure minimum is 0 and maximum is reasonable (e.g., 99)
      next = Math.max(0, Math.min(99, next));
      
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const pendingCount = Object.values(pendingQty).reduce((a, b) => a + b, 0);

  const handleConfirm = () => {
    let addedCount = 0;
    Object.entries(pendingQty).forEach(([menuItemId, qty]) => {
      if (qty <= 0) return;
      const item = filteredItems.find(i => i.id === menuItemId)
        ?? Object.values(menuData?.grouped_menu ?? {})
          .flatMap(g => g.menu_items)
          .find(i => i.id === menuItemId);
      if (item) {
        onAddItem(item, qty);
        addedCount++;
      }
    });
    if (addedCount > 0) {
      Toast.show({ type: 'success', text1: `${addedCount} item(s) added`, visibilityTime: 1500 });
    }
    onClose();
  };

  // Helper to format quantity display (show as integer if whole number, otherwise show decimal)
  const formatQty = (qty: number) => {
    return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[d.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[d.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={d.handle} />

        {/* Header */}
        <View style={d.header}>
          <View>
            <Text style={d.headerTitle}>Add Menu Items</Text>
            <Text style={d.headerSub}>
              {filteredItems.filter(i => i.is_available).length} items available
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Ionicons name="close" size={22} color={C.textMid} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={d.searchWrap}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} style={d.searchIcon} />
          <TextInput
            style={d.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search dishes…"
            placeholderTextColor={C.textMuted}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Category filter chips */}
        {categories.length > 0 && (
          <View style={d.categoryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={d.chipScroll}
              contentContainerStyle={d.chipScrollContent}
            >
              <TouchableOpacity
                style={[d.catChip, !selectedSlug && d.catChipActive]}
                onPress={() => setSelectedSlug(null)}
              >
                <Text style={[d.catChipTxt, !selectedSlug && d.catChipTxtActive]}>All</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.slug}
                  style={[d.catChip, selectedSlug === cat.slug && d.catChipActive]}
                  onPress={() => setSelectedSlug(prev => prev === cat.slug ? null : cat.slug)}
                >
                  <Text style={[d.catChipTxt, selectedSlug === cat.slug && d.catChipTxtActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Item list */}
        {menuLoading ? (
          <View style={d.loadingWrap}>
            <ActivityIndicator size="large" color={C.brand} />
            <Text style={d.loadingTxt}>Loading menu…</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={d.emptyWrap}>
            <Ionicons name="restaurant-outline" size={40} color={C.textMuted} />
            <Text style={d.emptyTxt}>No items found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={item => item.id}
            style={d.list}
            contentContainerStyle={d.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const qty = getPendingQty(item.id);
              const alreadyInOrder = Object.values(currentItems).find(
                ci => (ci as any).menu_id === item.id && !ci.isDeleted
              );
              const unavailable = !item.is_available;

              return (
                <View style={[d.menuItem, unavailable && d.menuItemUnavailable]}>
                  {/* Image */}
                  <View style={d.menuThumb}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={d.menuThumbImg} resizeMode="cover" />
                    ) : (
                      <View style={d.menuThumbPlaceholder}>
                        <Ionicons name="fast-food-outline" size={20} color={C.textMuted} />
                      </View>
                    )}
                    {unavailable && (
                      <View style={d.unavailableBadge}>
                        <Text style={d.unavailableTxt}>Unavailable</Text>
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={d.menuInfo}>
                    <Text style={[d.menuName, unavailable && { color: C.textMuted }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={d.menuDesc} numberOfLines={1}>{item.description}</Text>
                    ) : null}
                    <View style={d.menuBottom}>
                      <Text style={d.menuPrice}>₹{item.price.toFixed(2)}</Text>
                      {alreadyInOrder && (
                        <View style={d.alreadyBadge}>
                          <Text style={d.alreadyTxt}>×{alreadyInOrder.quantity} in order</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Qty stepper - now with 0.5 increments */}
                  {unavailable ? (
                    <View style={d.unavailableStepper}>
                      <Ionicons name="close-circle-outline" size={22} color={C.textMuted} />
                    </View>
                  ) : qty === 0 ? (
                    <TouchableOpacity
                      style={d.addBtn}
                      onPress={() => adjustQty(item.id, 0.5)}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <View style={d.stepper}>
                      <TouchableOpacity 
                        style={d.stepBtn} 
                        onPress={() => adjustQty(item.id, -0.5)}
                      >
                        <Ionicons name="remove" size={14} color={C.textMid} />
                      </TouchableOpacity>
                      <View style={d.qtyBox}>
                        <Text style={d.qtyTxt}>{formatQty(qty)}</Text>
                      </View>
                      <TouchableOpacity 
                        style={d.stepBtn} 
                        onPress={() => adjustQty(item.id, 0.5)}
                      >
                        <Ionicons name="add" size={14} color={C.textMid} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}

        {/* Confirm footer */}
        <View style={d.footer}>
          <TouchableOpacity style={d.cancelBtn} onPress={onClose}>
            <Text style={d.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[d.confirmBtn, pendingCount === 0 && d.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={pendingCount === 0}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={d.confirmTxt}>
              Add {pendingCount > 0 ? `${formatQty(pendingCount)} item${pendingCount > 1 ? 's' : ''}` : 'Items'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Dialog styles ────────────────────────────────────────────────────────────

const d = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.88,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 10, marginBottom: 4, flexShrink: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, flexShrink: 0 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, marginBottom: 8, backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, height: 44, flexShrink: 0 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 0 },

  categoryContainer: { 
    flexShrink: 0, 
    maxHeight: 60,
    marginBottom: 4,
  },
  chipScroll: { 
    maxHeight: 48,
  },
  chipScrollContent: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    gap: 8, 
    flexDirection: 'row',
    alignItems: 'center',
  },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  catChipActive: { backgroundColor: C.brand, borderColor: C.brand },
  catChipTxt: { fontSize: 13, fontWeight: '600', color: C.textMid },
  catChipTxtActive: { color: '#fff' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48, gap: 12 },
  loadingTxt: { fontSize: 14, color: C.textMuted },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTxt: { fontSize: 14, color: C.textMuted },

  list: { 
    flex: 1,
    marginBottom: 0,
  },
  listContent: { 
    paddingHorizontal: 16, 
    paddingVertical: 8,
    paddingBottom: 8,
  },

  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  menuItemUnavailable: { opacity: 0.55 },
  menuThumb: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden', marginRight: 12, position: 'relative' },
  menuThumbImg: { width: '100%', height: '100%' },
  menuThumbPlaceholder: { width: '100%', height: '100%', backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  unavailableBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 2 },
  unavailableTxt: { fontSize: 8, color: '#fff', textAlign: 'center', fontWeight: '700' },

  menuInfo: { flex: 1, marginRight: 8 },
  menuName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
  menuDesc: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  menuBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuPrice: { fontSize: 14, fontWeight: '700', color: C.brand },
  alreadyBadge: { backgroundColor: C.successBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  alreadyTxt: { fontSize: 10, color: C.success, fontWeight: '600' },

  unavailableStepper: { width: 40, alignItems: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.brand, justifyContent: 'center', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  qtyBox: { 
    minWidth: 42,
    height: 28, 
    borderRadius: 8, 
    backgroundColor: C.brandLight, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 8,
    borderWidth: 1, 
    borderColor: C.brand 
  },
  qtyTxt: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: C.brand,
    minWidth: 28,
    textAlign: 'center',
  },

  footer: { 
    flexDirection: 'row', 
    gap: 10, 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    paddingBottom: 24, 
    borderTopWidth: 1, 
    borderTopColor: C.border,
    flexShrink: 0,
    backgroundColor: C.surface,
  },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: C.textMid },
  confirmBtn: { flex: 2, height: 48, borderRadius: 12, backgroundColor: C.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Main Page ────────────────────────────────────────────────────────────────

function TableSessionPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tableSessionId = params['table-session'] as string;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showAddMenuDialog, setShowAddMenuDialog] = useState(false);
  const [showOriginalData, setShowOriginalData] = useState(false);
  const [editedItems, setEditedItems] = useState<Record<string, EditedItem>>({});
  const [editedCustomerName, setEditedCustomerName] = useState('');
  const [editedCustomerPhone, setEditedCustomerPhone] = useState('');
  const [editedNote, setEditedNote] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const itemScales = useRef<Record<string, Animated.Value>>({});
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  if (!tableSessionId) return null;

  const { data, isLoading, isError, refetch } = useGetOrderRequestsBySessionId(tableSessionId, true);
  const orderRequest = data?.order_request as CustomerOrderRequest | undefined;

  // ── Menu data for the Add Menu dialog ──
  const { data: menuData, isLoading: menuLoading } = useGetCachedMenuItems(true) as {
    data: GroupedApiResponse | undefined;
    isLoading: boolean;
    isError: boolean;
  };


  if (!isLoading && isError) {
    return <Redirect href={"/(main)/order-request"} />;
  }

  useEffect(() => {
    if (!orderRequest) return;
    const init: Record<string, EditedItem> = {};
    orderRequest.order_items.forEach(item => {
      init[item.id] = { ...item, originalQuantity: item.quantity, isDeleted: false, isModified: false };
    });
    setEditedItems(init);
    setEditedCustomerName(orderRequest.customer_name || '');
    setEditedCustomerPhone(orderRequest.customer_phone || '');
    setEditedNote(orderRequest.note || '');
  }, [orderRequest?.id]);

  // ── Handler: waiter adds a menu item with valid UUID ──────────────────────
  const handleAddMenuItemFromDialog = useCallback((menuItem: MenuItemsResponse, qty: number) => {
    setEditedItems(prev => {
      // If the item already exists in the order (even if deleted), just update qty
      const existingEntry = Object.values(prev).find(
        ei => (ei as any).menu_id === menuItem.id
      );

      if (existingEntry) {
        return {
          ...prev,
          [existingEntry.id]: {
            ...existingEntry,
            quantity: existingEntry.quantity + qty,
            isDeleted: false,
            isModified: true,
          },
        };
      }

      // Create a brand-new EditedItem for a waiter-added entry with a valid UUID
      const newId = generateUUID();
      const newItem: EditedItem = {
        id: newId,
        order_id: orderRequest?.id ?? '',
        menu_id: menuItem.id,
        menu_name: menuItem.name,
        menu_image: menuItem.image_url ?? null,
        quantity: qty,
        price: menuItem.price,
        status: 'not-approved',
        created_at: new Date().toISOString(),
        originalQuantity: 0,
        isDeleted: false,
        isModified: true,
        isNew: true,
      } as EditedItem;

      return { ...prev, [newId]: newItem };
    });
  }, [orderRequest?.id]);

  const openModal = useCallback(() => {
    setShowSummaryModal(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const closeModal = useCallback(() => {
    if (isApproving) return;
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setShowSummaryModal(false));
  }, [isApproving]);

  const getItemScale = (id: string) => {
    if (!itemScales.current[id]) {
      itemScales.current[id] = new Animated.Value(1);
    }
    return itemScales.current[id];
  };

  const bounceItem = (id: string) => {
    const scale = getItemScale(id);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
    ]).start();
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      Toast.show({ type: 'success', text1: 'Refreshed', visibilityTime: 1200 });
    } catch {
      Toast.show({ type: 'error', text1: 'Refresh failed', visibilityTime: 1500 });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteSession = () => {
    if (isDeletingSession || isApproving) return;
    Alert.alert(
      'Delete Table Session',
      'Are you sure you want to delete this entire table session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!orderRequest?.customer_phone || !orderRequest?.table_session?.table_number) return;
            setIsDeletingSession(true);
            try {
              const res = await deleteTableSession(tableSessionId, orderRequest.customer_phone, orderRequest.table_session.table_number);
              if (res.success) {
                Toast.show({ type: 'success', text1: res.message || 'Session deleted successfully', visibilityTime: 2000 });
                queryClient.invalidateQueries({ queryKey: ["get-order-requests"] });
                setTimeout(() => { router.replace('/(main)/order-request'); }, 400);
              } else {
                throw new Error(res.error || 'Failed to delete session');
              }
            } catch (err: any) {
              Toast.show({ type: 'error', text1: 'Failed to delete session', text2: err?.message || 'Please try again', visibilityTime: 2500 });
            } finally {
              setIsDeletingSession(false);
            }
          },
        },
      ]
    );
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    if (isApproving) return;
    bounceItem(itemId);
    setEditedItems(prev => {
      const cur = prev[itemId];
      if (!cur) return prev;
      const newQty = Math.max(0.5, parseFloat((cur.quantity + delta).toFixed(1)));
      return { ...prev, [itemId]: { ...cur, quantity: newQty, isModified: newQty !== cur.originalQuantity } };
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (isApproving) return;
    Alert.alert('Remove Item', 'Remove this item from the order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => setEditedItems(prev => ({
          ...prev,
          [itemId]: { ...prev[itemId], isDeleted: true, isModified: true },
        })),
      },
    ]);
  };

  const handleRestoreItem = (itemId: string) => {
    if (isApproving) return;
    setEditedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], isDeleted: false, isModified: prev[itemId].quantity !== prev[itemId].originalQuantity },
    }));
    Toast.show({ type: 'success', text1: 'Item restored', visibilityTime: 1200 });
  };

  const handleRestoreAll = () => {
    if (isApproving) return;
    Alert.alert('Restore All', 'Restore all removed items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore All',
        onPress: () => {
          setEditedItems(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => {
              if (next[k].isDeleted) next[k] = { ...next[k], isDeleted: false };
            });
            return next;
          });
          Toast.show({ type: 'success', text1: 'All items restored', visibilityTime: 1200 });
        },
      },
    ]);
  };

  const handleReset = () => {
    if (isApproving || !orderRequest) return;
    Alert.alert('Reset Changes', 'Restore the original order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: () => {
          const reset: Record<string, EditedItem> = {};
          orderRequest.order_items.forEach(item => {
            reset[item.id] = { ...item, originalQuantity: item.quantity, isDeleted: false, isModified: false };
          });
          setEditedItems(reset);
          setEditedCustomerName(orderRequest.customer_name || '');
          setEditedCustomerPhone(orderRequest.customer_phone || '');
          setEditedNote(orderRequest.note || '');
        },
      },
    ]);
  };

const handleApprove = async () => {
  if (!orderRequest || isApproving || !user) return;
  setIsApproving(true);
  try {
    const itemsToApprove = Object.values(editedItems).filter(i => !i.isDeleted);

    // ALL existing items (new=false), whether modified or not
    const existingItems = itemsToApprove.filter(i => !(i as any).isNew);

    // Only waiter-added items
    const newAddedItems = itemsToApprove.filter(i => (i as any).isNew);

    const orderMenuItems: ApproveOrderItem[] = existingItems.map(item => ({
      id: item.id,
      order_id: item.order_id,
      menu_item_id: (item as any).menu_id,
      quantity: item.quantity,
      price: item.price,
      has_changed: item.isModified ?? false, // ← true only if actually edited
      created_at: new Date().toISOString(),
    }));

    const addedMenuItems: ApproveOrderItem[] = newAddedItems.map(item => ({
      id: item.id,
      order_id: item.order_id,
      menu_item_id: (item as any).menu_id,
      quantity: item.quantity,
      price: item.price,
      has_changed: true,
      created_at: new Date().toISOString(),
    }));

    const deletedOrderItemIds = deletedItems.map(item => item.id);

    const payload: ApproveOrderType = {
      id: orderRequest.id,
      table_session_id: orderRequest.table_session.id,
      table_number: orderRequest.table_session.table_number,
      customer_name: editedCustomerName?.trim() || null,
      customer_phone: editedCustomerPhone?.trim() || null,
      note: editedNote?.trim() || null,
      waiter_id: user.id,
      order_menu_items: orderMenuItems,   // all existing items
      added_menu_items: addedMenuItems,   // only waiter-added
      deleted_order_items: deletedOrderItemIds,
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    const res = await approveOrder(payload);
    if (res.success) {
      Toast.show({ type: 'success', text1: res.message || 'Order approved!', visibilityTime: 2000 });
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["get-order-requests"] });
      setTimeout(() => {
        refetch();
        router.replace('/(main)/orders-status');
      }, 400);
    } else {
      throw new Error(res.message || 'Approval failed');
    }
  } catch (error: any) {
    console.error('Approval error:', error);
    Toast.show({ type: 'error', text1: 'Failed to approve', text2: error?.message || 'Please try again', visibilityTime: 2000 });
  } finally {
    setIsApproving(false);
  }
};

  // ── Derived values ──────────────────────────────────────────────────────────
  const visibleItems = Object.values(editedItems).filter(i => !i.isDeleted);
  const deletedItems = Object.values(editedItems).filter(i => i.isDeleted);
  const newItems = visibleItems.filter(i => (i as any).isNew);
  const modifiedCount = visibleItems.filter(i => i.isModified).length;
  const grandTotal = visibleItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const originalTotal = orderRequest?.order_items.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;
  const hasChanges = modifiedCount > 0 || deletedItems.length > 0 ||
    editedCustomerName !== (orderRequest?.customer_name || '') ||
    editedCustomerPhone !== (orderRequest?.customer_phone || '') ||
    editedNote !== (orderRequest?.note || '');

  const fmtPrice = (n: number) => `₹${n.toFixed(2)}`;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  const fmtTime = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    'approved': { label: 'Approved', bg: C.successBg, text: C.success },
    'not-approved': { label: 'Pending', bg: '#FFF7ED', text: '#9A3412' },
    'progress': { label: 'In Progress', bg: C.infoBg, text: C.info },
    'completed': { label: 'Completed', bg: C.successBg, text: C.success },
    'cancelled': { label: 'Cancelled', bg: C.dangerBg, text: C.danger },
  };

  const TABLE_STATUS: Record<string, { bg: string; text: string }> = {
    occupied: { bg: '#FFF0EB', text: C.brand },
    empty: { bg: C.successBg, text: C.success },
    booked: { bg: C.infoBg, text: C.info },
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.brand} />
        <Text style={s.loadingLabel}>Loading order…</Text>
      </View>
    );
  }

  if (isError || !orderRequest) {
    return (
      <View style={s.center}>
        <View style={[s.iconCircle, { backgroundColor: C.dangerBg }]}>
          <Ionicons name="alert-circle" size={32} color={C.danger} />
        </View>
        <Text style={s.errTitle}>Couldn't load order</Text>
        <Text style={s.errSub}>Session: {tableSessionId}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
          <Text style={s.retryTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { table_session } = orderRequest;
  const tableStatus = TABLE_STATUS[table_session.status] ?? { bg: '#F3F4F6', text: C.textMid };
  const orderSt = STATUS_CONFIG[orderRequest.status] ?? STATUS_CONFIG['not-approved'];

  return (
    <>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={s.root}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* ── Hero header ─────────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroLabel}>TABLE</Text>
              <Text style={s.heroTable}>{table_session.table_number}</Text>
            </View>
            <View style={s.heroRight}>
              <View style={[s.pill, { backgroundColor: tableStatus.bg }]}>
                <View style={[s.dot, { backgroundColor: tableStatus.text }]} />
                <Text style={[s.pillTxt, { color: tableStatus.text }]}>
                  {table_session.status.charAt(0).toUpperCase() + table_session.status.slice(1)}
                </Text>
              </View>
              <TouchableOpacity
                style={s.refreshBtn}
                onPress={handleManualRefresh}
                disabled={isApproving || refreshing || isDeletingSession}
              >
                <Ionicons name={refreshing ? 'hourglass' : 'refresh'} size={18} color={C.brand} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.deleteSessionBtn}
                onPress={handleDeleteSession}
                disabled={isApproving || isDeletingSession}
              >
                {isDeletingSession
                  ? <ActivityIndicator size="small" color={C.danger} />
                  : <Ionicons name="trash-outline" size={18} color={C.danger} />
                }
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.heroMeta}>
            <View style={s.heroMetaItem}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={s.heroMetaTxt}>{fmtDate(table_session.open_time)} · {fmtTime(table_session.open_time)}</Text>
            </View>
            <View style={[s.pill, { backgroundColor: orderSt.bg, marginLeft: 'auto' }]}>
              <Text style={[s.pillTxt, { color: orderSt.text }]}>{orderSt.label}</Text>
            </View>
          </View>

          {(modifiedCount > 0 || deletedItems.length > 0 || newItems.length > 0) && (
            <View style={s.chips}>
              {modifiedCount > 0 && (
                <View style={[s.chip, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Ionicons name="pencil" size={11} color="#fff" />
                  <Text style={s.chipTxt}>{modifiedCount} edited</Text>
                </View>
              )}
              {newItems.length > 0 && (
                <View style={[s.chip, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="add-circle" size={11} color="#fff" />
                  <Text style={s.chipTxt}>{newItems.length} added</Text>
                </View>
              )}
              {deletedItems.length > 0 && (
                <View style={[s.chip, { backgroundColor: 'rgba(220,38,38,0.25)' }]}>
                  <Ionicons name="trash" size={11} color="#FCA5A5" />
                  <Text style={[s.chipTxt, { color: '#FCA5A5' }]}>{deletedItems.length} removed</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Customer card ────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Customer</Text>
          <View style={s.card}>
            <View style={s.inputRow}>
              <View style={s.inputIconWrap}>
                <Ionicons name="person-outline" size={16} color={C.brand} />
              </View>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Name</Text>
                <TextInput
                  style={[s.input, isApproving && s.inputDisabled]}
                  value={editedCustomerName}
                  onChangeText={setEditedCustomerName}
                  placeholder="Guest"
                  placeholderTextColor={C.textMuted}
                  editable={!isApproving}
                />
              </View>
            </View>
            <View style={[s.inputRow, s.inputRowBorder]}>
              <View style={s.inputIconWrap}>
                <Ionicons name="call-outline" size={16} color={C.brand} />
              </View>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Phone</Text>
                <TextInput
                  style={[s.input, isApproving && s.inputDisabled]}
                  value={editedCustomerPhone}
                  onChangeText={setEditedCustomerPhone}
                  placeholder="—"
                  placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                  editable={!isApproving}
                />
              </View>
            </View>
            <View style={[s.inputRow, s.inputRowBorder, { alignItems: 'flex-start' }]}>
              <View style={[s.inputIconWrap, { paddingTop: 2 }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.brand} />
              </View>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.inputLabel}>Special instructions</Text>
                <TextInput
                  style={[s.input, s.textArea, isApproving && s.inputDisabled]}
                  value={editedNote}
                  onChangeText={setEditedNote}
                  placeholder="Any allergies or requests…"
                  placeholderTextColor={C.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isApproving}
                />
              </View>
            </View>
          </View>
        </View>

        {/* ── Order items ──────────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Order Items</Text>
            <View style={s.countBadge}>
              <Text style={s.countBadgeTxt}>{visibleItems.length}</Text>
            </View>
            {hasChanges && (
              <TouchableOpacity onPress={handleReset} disabled={isApproving} style={s.resetLink}>
                <Ionicons name="refresh-circle-outline" size={14} color={C.brand} />
                <Text style={s.resetLinkTxt}>Reset</Text>
              </TouchableOpacity>
            )}
            {/* ── Add Item Button ── */}
            <TouchableOpacity
              onPress={() => setShowAddMenuDialog(true)}
              disabled={isApproving}
              style={s.addItemBtn}
            >
              <Ionicons name="add-circle-outline" size={14} color="#fff" />
              <Text style={s.addItemBtnTxt}>Add Item</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            {visibleItems.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="restaurant-outline" size={36} color={C.textMuted} />
                <Text style={s.emptyStateTxt}>
                  {Object.keys(editedItems).length === 0 ? 'No items in this order' : 'All items removed'}
                </Text>
                <TouchableOpacity
                  style={s.emptyAddBtn}
                  onPress={() => setShowAddMenuDialog(true)}
                  disabled={isApproving}
                >
                  <Ionicons name="add-circle-outline" size={16} color={C.brand} />
                  <Text style={s.emptyAddBtnTxt}>Add from menu</Text>
                </TouchableOpacity>
              </View>
            ) : (
              visibleItems.map((item, idx) => {
                const isExpanded = expandedItemId === item.id;
                const scaleAnim = getItemScale(item.id);
                const isNewItem = (item as any).isNew;

                return (
                  <Animated.View key={item.id} style={{ transform: [{ scale: scaleAnim }] }}>
                    {idx > 0 && <View style={s.divider} />}
                    <View style={[s.itemRow, isNewItem && s.itemRowNew]}>
                      <TouchableOpacity
                        onPress={() => setExpandedItemId(isExpanded ? null : item.id)}
                        activeOpacity={0.8}
                        style={s.thumb}
                      >
                        {item.menu_image ? (
                          <Image source={{ uri: item.menu_image }} style={s.thumbImg} resizeMode="cover" />
                        ) : (
                          <View style={s.thumbPlaceholder}>
                            <Ionicons name="fast-food-outline" size={18} color={C.textMuted} />
                          </View>
                        )}
                        {isNewItem ? (
                          <View style={[s.modifiedDot, { backgroundColor: C.success }]} />
                        ) : item.isModified ? (
                          <View style={s.modifiedDot} />
                        ) : null}
                      </TouchableOpacity>

                      <View style={s.itemContent}>
                        <TouchableOpacity
                          onPress={() => setExpandedItemId(isExpanded ? null : item.id)}
                          activeOpacity={0.7}
                          style={s.itemNameRow}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                            <Text style={s.itemName} numberOfLines={1}>{item.menu_name}</Text>
                            {isNewItem && (
                              <View style={s.newBadge}>
                                <Text style={s.newBadgeTxt}>NEW</Text>
                              </View>
                            )}
                          </View>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={15}
                            color={C.textMuted}
                          />
                        </TouchableOpacity>

                        <View style={s.itemControls}>
                          <View style={s.stepper}>
                            <TouchableOpacity
                              style={s.stepBtn}
                              onPress={() => handleQuantityChange(item.id, -0.5)}
                              disabled={isApproving}
                            >
                              <Ionicons name="remove" size={14} color={isApproving ? C.textMuted : C.textMid} />
                            </TouchableOpacity>
                            <View style={[s.qtyBox, item.isModified && s.qtyBoxModified]}>
                              <Text style={[s.qtyTxt, item.isModified && s.qtyTxtModified]}>
                                {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={s.stepBtn}
                              onPress={() => handleQuantityChange(item.id, 0.5)}
                              disabled={isApproving}
                            >
                              <Ionicons name="add" size={14} color={isApproving ? C.textMuted : C.textMid} />
                            </TouchableOpacity>
                          </View>

                          <View style={s.itemRight}>
                            <Text style={s.itemPrice}>{fmtPrice(item.price * item.quantity)}</Text>
                            <TouchableOpacity
                              style={s.deleteBtn}
                              onPress={() => handleDeleteItem(item.id)}
                              disabled={isApproving}
                            >
                              <Ionicons name="trash-outline" size={16} color={isApproving ? C.textMuted : C.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {item.isModified && !isNewItem && (
                          <Text style={s.originalQtyHint}>was {item.originalQuantity}</Text>
                        )}
                      </View>
                    </View>

                    {isExpanded && (
                      <View style={s.expandedDetail}>
                        <DetailRow label="Unit price" value={fmtPrice(item.price)} />
                        <DetailRow label="Item ID" value={item.id.slice(0, 8) + '…'} />
                        <DetailRow label="Status" value={isNewItem ? 'Waiter Added' : item.status} accent={isNewItem ? C.success : STATUS_CONFIG[item.status]?.text} />
                        <DetailRow label="Added" value={`${fmtDate(item.created_at)} · ${fmtTime(item.created_at)}`} />
                      </View>
                    )}
                  </Animated.View>
                );
              })
            )}

            {deletedItems.length > 0 && (
              <View style={s.removedStrip}>
                <View style={s.removedHeader}>
                  <Text style={s.removedTitle}>Removed ({deletedItems.length})</Text>
                  {deletedItems.length > 1 && (
                    <TouchableOpacity onPress={handleRestoreAll} disabled={isApproving}>
                      <Text style={s.restoreAllTxt}>Restore all</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {deletedItems.map(item => (
                  <View key={item.id} style={s.removedItem}>
                    <Ionicons name="close-circle" size={14} color={C.danger} />
                    <Text style={s.removedItemName} numberOfLines={1}>{item.menu_name}</Text>
                    <Text style={s.removedItemQty}>×{item.originalQuantity}</Text>
                    <TouchableOpacity onPress={() => handleRestoreItem(item.id)} disabled={isApproving} style={s.restoreBtn}>
                      <Ionicons name="refresh" size={13} color={C.brand} />
                      <Text style={s.restoreTxt}>Restore</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={s.totalRow}>
              <View>
                <Text style={s.totalLabel}>Total</Text>
                {showOriginalData && grandTotal !== originalTotal && (
                  <Text style={s.originalTotal}>was {fmtPrice(originalTotal)}</Text>
                )}
              </View>
              <Text style={[
                s.totalAmt,
                grandTotal > originalTotal && { color: C.success },
                grandTotal < originalTotal && { color: C.danger },
              ]}>
                {fmtPrice(grandTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footerContainer}>
          <View style={s.footerContent}>
            <TouchableOpacity
              style={s.footerSecondary}
              onPress={() => setShowOriginalData(v => !v)}
              disabled={isApproving}
            >
              <Ionicons name={showOriginalData ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMid} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.footerPrimary, isApproving && s.footerPrimaryDisabled]}
              onPress={openModal}
              disabled={isApproving}
              activeOpacity={0.85}
            >
              {isApproving
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={s.footerPrimaryTxt}>
                    Review & Approve
                    {visibleItems.length > 0 ? ` · ${visibleItems.length} items` : ''}
                  </Text>
                </>
              }
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* ── Summary bottom sheet ─────────────────────────────────────────────── */}
      {showSummaryModal && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeModal} activeOpacity={1} />
          </Animated.View>

          <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Order Summary</Text>
              <TouchableOpacity onPress={closeModal} disabled={isApproving} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                <Ionicons name="close" size={22} color={isApproving ? C.textMuted : C.textMid} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false} bounces={false}>
              <View style={s.summaryBlock}>
                <SummaryRow icon="restaurant-outline" label="Table" value={`#${table_session.table_number}`} />
                <SummaryRow icon="person-outline" label="Customer" value={editedCustomerName || 'Guest'} />
                {editedCustomerPhone ? <SummaryRow icon="call-outline" label="Phone" value={editedCustomerPhone} /> : null}
                {editedNote ? (
                  <View style={s.noteBlock}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.textMuted} />
                    <Text style={s.noteTxt} numberOfLines={3}>{editedNote}</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.summaryBlock}>
                <Text style={s.summaryBlockTitle}>Items</Text>
                {visibleItems.length === 0 ? (
                  <Text style={[s.summaryItemMeta, { paddingVertical: 8, fontStyle: 'italic' }]}>
                    No items — approving with empty order
                  </Text>
                ) : (
                  visibleItems.map(item => (
                    <View key={item.id} style={s.summaryItem}>
                      <View style={s.summaryItemLeft}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={s.summaryItemName} numberOfLines={1}>{item.menu_name}</Text>
                          {(item as any).isNew && (
                            <View style={s.newBadge}>
                              <Text style={s.newBadgeTxt}>NEW</Text>
                            </View>
                          )}
                        </View>
                        <Text style={s.summaryItemMeta}>
                          {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)} × {fmtPrice(item.price)}
                          {item.isModified && !(item as any).isNew && <Text style={s.summaryItemWas}>  (was {item.originalQuantity})</Text>}
                        </Text>
                      </View>
                      <Text style={s.summaryItemTotal}>{fmtPrice(item.price * item.quantity)}</Text>
                    </View>
                  ))
                )}
                <View style={s.summaryTotalRow}>
                  <Text style={s.summaryTotalLabel}>Grand total</Text>
                  <Text style={s.summaryTotalAmt}>{fmtPrice(grandTotal)}</Text>
                </View>
              </View>

              {deletedItems.length > 0 && (
                <View style={[s.summaryBlock, s.removedBlock]}>
                  <Text style={[s.summaryBlockTitle, { color: C.danger }]}>Removed</Text>
                  {deletedItems.map(item => (
                    <View key={item.id} style={s.summaryRemovedItem}>
                      <Text style={s.summaryRemovedName} numberOfLines={1}>{item.menu_name}</Text>
                      <TouchableOpacity onPress={() => handleRestoreItem(item.id)} disabled={isApproving} style={s.restoreBtn}>
                        <Ionicons name="refresh" size={13} color={C.brand} />
                        <Text style={s.restoreTxt}>Restore</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={s.notice}>
                <Ionicons name="information-circle-outline" size={16} color={C.brand} />
                <Text style={s.noticeTxt}>
                  Approving will send this order to the kitchen. Changes cannot be undone.
                </Text>
              </View>
            </ScrollView>

            <View style={[s.sheetFooter, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
              <TouchableOpacity
                style={[s.sheetCancel, isApproving && s.btnDisabled]}
                onPress={closeModal}
                disabled={isApproving}
              >
                <Text style={s.sheetCancelTxt}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sheetConfirm, isApproving && s.btnDisabled]}
                onPress={handleApprove}
                disabled={isApproving}
                activeOpacity={0.85}
              >
                {isApproving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={s.sheetConfirmTxt}>Approve Order</Text>
                  </>
                }
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* ── Add Menu Dialog ───────────────────────────────────────────────────── */}
      {showAddMenuDialog && (
        <AddMenuDialog
          visible={showAddMenuDialog}
          onClose={() => setShowAddMenuDialog(false)}
          menuData={menuData}
          menuLoading={menuLoading}
          currentItems={editedItems}
          onAddItem={handleAddMenuItemFromDialog}
        />
      )}
    </>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.summaryRow}>
      <Ionicons name={icon as any} size={14} color={C.textMuted} style={{ marginTop: 1 }} />
      <Text style={s.summaryRowLabel}>{label}</Text>
      <Text style={s.summaryRowValue}>{value}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 10 },
  scrollContent: { paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, padding: 32 },

  loadingLabel: { marginTop: 14, color: C.textMid, fontSize: 15, fontWeight: '500' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  errTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 6 },
  errSub: { fontSize: 12, color: C.textMuted, marginBottom: 20, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  retryBtn: { backgroundColor: C.brand, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  hero: { backgroundColor: C.brand, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  heroLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, marginBottom: 2 },
  heroTable: { fontSize: 48, fontWeight: '800', color: '#fff', lineHeight: 52 },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center' },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaTxt: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  chips: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipTxt: { fontSize: 11, color: '#fff', fontWeight: '600' },

  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  pillTxt: { fontSize: 12, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3 },

  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.brandLight, justifyContent: 'center', alignItems: 'center' },
  deleteSessionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(220,38,38,0.15)', justifyContent: 'center', alignItems: 'center' },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.textMid, letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  countBadge: { backgroundColor: C.brandLight, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  countBadgeTxt: { fontSize: 11, fontWeight: '700', color: C.brand },
  resetLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  resetLinkTxt: { fontSize: 12, color: C.brand, fontWeight: '600' },
  addItemBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.brand, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  addItemBtnTxt: { fontSize: 12, color: '#fff', fontWeight: '700' },

  card: { backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border },

  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  inputRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  inputIconWrap: { width: 28 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', marginBottom: 3, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { fontSize: 15, color: C.text, fontWeight: '500', paddingVertical: 0 },
  inputDisabled: { color: C.textMuted },
  textArea: { minHeight: 60, paddingTop: 4 },

  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },

  itemRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14 },
  itemRowNew: { backgroundColor: '#F0FFF4' },
  thumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', marginRight: 12, position: 'relative' },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { width: '100%', height: '100%', backgroundColor: '#F5F5F0', justifyContent: 'center', alignItems: 'center' },
  modifiedDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand, borderWidth: 1, borderColor: '#fff' },
  itemContent: { flex: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { fontSize: 15, fontWeight: '600', color: C.text, flex: 1, marginRight: 4 },
  itemControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  newBadge: { backgroundColor: C.successBg, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  newBadgeTxt: { fontSize: 9, fontWeight: '800', color: C.success, letterSpacing: 0.5 },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  qtyBox: { minWidth: 38, height: 28, borderRadius: 8, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, borderWidth: 1, borderColor: C.border },
  qtyBoxModified: { backgroundColor: C.brandLight, borderColor: C.brand },
  qtyTxt: { fontSize: 13, fontWeight: '700', color: C.textMid },
  qtyTxtModified: { color: C.brand },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: C.text },
  deleteBtn: { padding: 4 },
  originalQtyHint: { fontSize: 11, color: C.textMuted, marginTop: 4, fontStyle: 'italic' },

  expandedDetail: { backgroundColor: C.bg, marginHorizontal: 16, marginBottom: 12, borderRadius: 10, padding: 12, gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 12, color: C.textMuted },
  detailValue: { fontSize: 12, color: C.textMid, fontWeight: '500' },

  removedStrip: { borderTopWidth: 1, borderTopColor: '#FEE2E2', backgroundColor: '#FFF8F8', marginTop: 4, padding: 12 },
  removedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  removedTitle: { fontSize: 12, fontWeight: '700', color: C.danger, textTransform: 'uppercase', letterSpacing: 0.5 },
  restoreAllTxt: { fontSize: 12, color: C.brand, fontWeight: '600' },
  removedItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  removedItemName: { flex: 1, fontSize: 13, color: C.textMid, textDecorationLine: 'line-through' },
  removedItemQty: { fontSize: 12, color: C.textMuted },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.brandLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 3 },
  restoreTxt: { fontSize: 11, color: C.brand, fontWeight: '600' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border },
  totalLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  originalTotal: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  totalAmt: { fontSize: 22, fontWeight: '800', color: C.brand },

  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  emptyStateTxt: { fontSize: 14, color: C.textMuted },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: C.brandLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  emptyAddBtnTxt: { fontSize: 13, color: C.brand, fontWeight: '600' },

  footerContainer: { marginTop: 24, marginHorizontal: 16, marginBottom: 8 },
  footerContent: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  footerSecondary: { width: 46, height: 46, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  footerPrimary: { flex: 1, height: 46, borderRadius: 12, backgroundColor: C.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footerPrimaryDisabled: { opacity: 0.45 },
  footerPrimaryTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.88,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  sheetFooter: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  sheetCancel: { flex: 1, height: 48, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  sheetCancelTxt: { fontSize: 15, fontWeight: '600', color: C.textMid },
  sheetConfirm: { flex: 2, height: 48, borderRadius: 12, backgroundColor: C.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sheetConfirmTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.45 },

  summaryBlock: { backgroundColor: C.bg, borderRadius: 12, padding: 14, marginBottom: 12 },
  summaryBlockTitle: { fontSize: 12, fontWeight: '700', color: C.textMid, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  summaryRowLabel: { fontSize: 13, color: C.textMuted, width: 68 },
  summaryRowValue: { flex: 1, fontSize: 13, fontWeight: '600', color: C.text },
  noteBlock: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', paddingTop: 4, borderTopWidth: 1, borderTopColor: C.border, marginTop: 4 },
  noteTxt: { flex: 1, fontSize: 13, color: C.textMid, fontStyle: 'italic', lineHeight: 18 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  summaryItemLeft: { flex: 1 },
  summaryItemName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
  summaryItemMeta: { fontSize: 12, color: C.textMuted },
  summaryItemWas: { fontStyle: 'italic' },
  summaryItemTotal: { fontSize: 14, fontWeight: '700', color: C.text },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 4 },
  summaryTotalLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  summaryTotalAmt: { fontSize: 20, fontWeight: '800', color: C.brand },
  removedBlock: { backgroundColor: '#FFF8F8' },
  summaryRemovedItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#FEE2E2' },
  summaryRemovedName: { flex: 1, fontSize: 13, color: C.textMid, textDecorationLine: 'line-through' },
  notice: { flexDirection: 'row', backgroundColor: C.brandLight, borderRadius: 12, padding: 14, gap: 10, marginBottom: 20, alignItems: 'flex-start' },
  noticeTxt: { flex: 1, fontSize: 13, color: C.textMid, lineHeight: 18 },
});

export default TableSessionPage;