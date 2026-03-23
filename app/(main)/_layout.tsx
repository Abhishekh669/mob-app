import { useUserStore } from "@/utils/store/user/use-user-store";
import { Slot, usePathname, useRouter } from "expo-router";
import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  Alert,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RemoveUserToken } from "@/utils/storage/user.auth.storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = Math.min(300, SCREEN_WIDTH * 0.82);

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  accent: "#e8622a",
  accentSoft: "#fff3ee",
  accentMid: "#fde0d2",
  accentDeep: "#c44d1e",
  ink: "#1a1410",
  ink2: "#5c4f43",
  ink3: "#9c8d82",
  surface: "#fffcf8",
  card: "#ffffff",
  divider: "#f0ebe4",
  graySoft: "#f5f4f2",
  tabBg: "#ffffff",
};

// ─── Tab Routes (bottom nav) ───────────────────────────────────────────────────
const ROUTES = [
  { label: "Home", path: "/(main)/home", icon: "home-outline", activeIcon: "home", tabIcon: "home-outline", tabActiveIcon: "home" },
  { label: "Orders", path: "/(main)/order-request", icon: "receipt-outline", activeIcon: "receipt", tabIcon: "receipt-outline", tabActiveIcon: "receipt" },
  { label: "Kitchen", path: "/(main)/orders-status", icon: "flame-outline", activeIcon: "flame", tabIcon: "flame-outline", tabActiveIcon: "flame" },
  { label: "Attendance", path: "/(main)/attendance", icon: "calendar-outline", activeIcon: "calendar", tabIcon: "calendar-outline", tabActiveIcon: "calendar" },
  {label: "Approval",path: "/(main)/approval-requests",icon: "checkmark-done-outline",activeIcon: "checkmark-done",tabIcon: "checkmark-done-outline",tabActiveIcon: "checkmark-done"}
];

// ─── Dummy sidebar-only routes (no real navigation) ───────────────────────────
const SIDEBAR_DUMMY_ROUTES = [
  { label: "Dashboard", icon: "grid-outline" },
  { label: "Reports", icon: "bar-chart-outline" },
  { label: "Inventory", icon: "cube-outline" },
  { label: "Staff", icon: "people-outline" },
  { label: "Settings", icon: "settings-outline" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getPageTitle(pathname: string): string {
  const match = ROUTES.find((r) => pathname.includes(r.path.split("/").pop()!));
  return match?.label ?? "DineX";
}

function isActive(routePath: string, pathname: string): boolean {
  return pathname.includes(routePath.split("/").pop()!);
}

// ─── Sidebar dummy item ────────────────────────────────────────────────────────
const SidebarDummyItem = ({
  item,
}: {
  item: typeof SIDEBAR_DUMMY_ROUTES[0];
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        style={ss.item}
        android_ripple={{ color: C.accentMid, borderless: false }}
      >
        <View style={ss.iconWrap}>
          <Ionicons name={item.icon as any} size={20} color={C.ink3} />
        </View>
        <Text style={ss.itemLabel}>{item.label}</Text>
      </Pressable>
    </Animated.View>
  );
};

const ss = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, marginBottom: 3 },
  itemActive: { backgroundColor: C.accentSoft },
  iconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.graySoft, alignItems: "center", justifyContent: "center", marginRight: 14 },
  iconWrapActive: { backgroundColor: C.accentMid },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: C.ink3 },
  itemLabelActive: { color: C.accent, fontWeight: "700" },
  activePip: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
});

// ─── Bottom tab item ───────────────────────────────────────────────────────────
const TabItem = ({
  route,
  pathname,
  onPress,
}: {
  route: typeof ROUTES[0];
  pathname: string;
  onPress: () => void;
}) => {
  const active = isActive(route.path, pathname);
  const scale = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(dotOpacity, {
      toValue: active ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [active]);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.82, friction: 8, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable style={ts.tabItem} onPress={handlePress} android_ripple={null}>
      <Animated.View style={[ts.tabInner, { transform: [{ scale }] }]}>
        <View style={[ts.tabIconWrap, active && ts.tabIconWrapActive]}>
          <Ionicons
            name={(active ? route.tabActiveIcon : route.tabIcon) as any}
            size={22}
            color={active ? C.accent : C.ink3}
          />
        </View>
        <Animated.Text style={[ts.tabLabel, active && ts.tabLabelActive, { opacity: dotOpacity }]}>
          {route.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
};

const ts = StyleSheet.create({
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabInner: { alignItems: "center", justifyContent: "center", paddingVertical: 6, gap: 3 },
  tabIconWrap: { width: 44, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  tabIconWrapActive: { backgroundColor: C.accentSoft },
  tabLabel: { fontSize: 10, fontWeight: "600", color: C.ink3, letterSpacing: 0.2 },
  tabLabelActive: { color: C.accent },
});

// ─── Main layout ───────────────────────────────────────────────────────────────
export default function MainLayout() {
  const { isAuthenticated, logout } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // ── Auth redirect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      const t = setTimeout(() => {
        router.replace("/(auth)/login");
        setIsCheckingAuth(false);
      }, 100);
      return () => clearTimeout(t);
    } else {
      setIsCheckingAuth(false);
    }
  }, [isAuthenticated]);

  // ── Close sidebar on nav ───────────────────────────────────────────────────
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // ── Sidebar animation ──────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: isSidebarOpen ? 0 : -SIDEBAR_WIDTH,
        friction: 22,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: isSidebarOpen ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSidebarOpen]);

  // ── Swipe-to-close ─────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isSidebarOpen,
      onMoveShouldSetPanResponder: (_, g) => isSidebarOpen && Math.abs(g.dx) > 10,
      onPanResponderMove: (_, g) => {
        translateX.setValue(Math.max(-SIDEBAR_WIDTH, Math.min(0, g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        setIsSidebarOpen(g.dx > -50);
      },
    })
  ).current;

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            logout();
            await RemoveUserToken();
            setTimeout(() => router.replace("/(auth)/login"), 100);
          } catch {
            Alert.alert("Error", "Failed to logout. Please try again.");
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  }, [logout, router, isLoggingOut]);

  // ── Navigate ───────────────────────────────────────────────────────────────
  const handleNavigate = (path: string) => {
    if (pathname !== path) router.push(path as any);
  };

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.surface }}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!isAuthenticated) return null;

  const pageTitle = getPageTitle(pathname);

  return (
    <View style={[layout.root, { backgroundColor: C.surface }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* ── Navbar — fixed at top using flex column ── */}
      <View style={[layout.navbar,]}>
        <View style={layout.navbarInner}>
          {/* Menu button */}
          <Pressable
            onPress={() => setIsSidebarOpen(true)}
            style={layout.menuBtn}
            android_ripple={{ color: C.accentMid, borderless: true, radius: 20 }}
          >
            <View style={layout.menuBtnLines}>
              <View style={layout.menuLine} />
              <View style={[layout.menuLine, { width: 14 }]} />
              <View style={[layout.menuLine, { width: 18 }]} />
            </View>
          </Pressable>

          {/* Title */}
          <View style={layout.navTitle}>
            <Text style={layout.navTitleText}>{pageTitle}</Text>
          </View>

          {/* Notification bell */}
          <Pressable
            style={layout.notifBtn}
            android_ripple={{ color: C.accentMid, borderless: true, radius: 20 }}
          >
            <Ionicons name="notifications-outline" size={22} color={C.ink2} />
            <View style={layout.notifBadge}>
              <Text style={layout.notifBadgeText}>3</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── Screen content — flex:1 to take remaining space ── */}
      <View style={layout.screenContainer}>
        <Slot />
      </View>

      {/* ── Bottom tab bar ── */}
      <View style={[layout.tabBar, { paddingBottom: insets.bottom }]}>
        <View style={layout.tabTopLine} />
        <View style={layout.tabRow}>
          {ROUTES.map((route) => (
            <TabItem
              key={route.path}
              route={route}
              pathname={pathname}
              onPress={() => handleNavigate(route.path)}
            />
          ))}
        </View>
      </View>

      {/* ── Backdrop ── */}
      <Animated.View
        style={[layout.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={isSidebarOpen ? "auto" : "none"}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setIsSidebarOpen(false)} />
      </Animated.View>

      {/* ── Sidebar ── */}
      <Animated.View
        style={[layout.sidebar, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={layout.sidebarContent}>
          {/* ── Brand header ── */}
          <View style={[layout.sidebarHeader, { paddingTop: insets.top + 16 }]}>
            <View style={layout.brandRow}>
              <View style={layout.brandLogo}>
                <Text style={layout.brandLogoText}>DX</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={layout.brandName}>DineX</Text>
                <Text style={layout.brandSub}>Restaurant Management</Text>
              </View>
            </View>
            <Pressable onPress={() => setIsSidebarOpen(false)} style={layout.closeBtn}>
              <Ionicons name="close" size={20} color={C.ink3} />
            </Pressable>
          </View>

          <View style={layout.divider} />

          {/* ── User card ── */}
          <View style={layout.userCard}>
            <View style={layout.userAvatar}>
              <Text style={layout.userAvatarText}>AD</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={layout.userName}>Admin User</Text>
              <View style={layout.userRolePill}>
                <View style={layout.userRoleDot} />
                <Text style={layout.userRoleText}>Restaurant Manager</Text>
              </View>
            </View>
          </View>

          <View style={layout.divider} />

          {/* ── Dummy nav items ── */}
          <View style={layout.navSection}>
            <Text style={layout.navSectionLabel}>NAVIGATION</Text>
            {SIDEBAR_DUMMY_ROUTES.map((item) => (
              <SidebarDummyItem key={item.label} item={item} />
            ))}
          </View>

          {/* ── Footer ── */}
          <View style={layout.sidebarFooter}>
            <View style={layout.divider} />
            <Pressable
              style={[layout.logoutBtn, isLoggingOut && layout.logoutBtnDisabled]}
              onPress={handleLogout}
              disabled={isLoggingOut}
              android_ripple={{ color: "#fde0d2" }}
            >
              <Ionicons
                name="log-out-outline"
                size={19}
                color={isLoggingOut ? C.ink3 : C.accent}
              />
              <Text style={[layout.logoutText, isLoggingOut && { color: C.ink3 }]}>
                {isLoggingOut ? "Logging out…" : "Logout"}
              </Text>
            </Pressable>
            <Text style={layout.versionText}>Version 1.0.0</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Layout styles ─────────────────────────────────────────────────────────────
const layout = StyleSheet.create({
  root: { flex: 1 },

  // Navbar — now part of flex column, not absolute
  navbar: {
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    zIndex: 5,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  navbarInner: {
    height: 56, // Fixed height for navbar content
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.graySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnLines: { gap: 4, alignItems: "flex-start" },
  menuLine: { height: 2, width: 20, backgroundColor: C.ink2, borderRadius: 2 },
  navTitle: { flex: 1, alignItems: "center" },
  navTitleText: { fontSize: 17, fontWeight: "700", color: C.ink, letterSpacing: -0.3 },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.graySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.card,
  },
  notifBadgeText: { color: "#fff", fontSize: 8, fontWeight: "800" },

  // Screen — flex:1 to fill remaining space between navbar and tab bar
  screenContainer: {
    flex: 1,
    backgroundColor: C.surface,
  },

  // Tab bar — now part of flex column, not absolute
  tabBar: {
    backgroundColor: C.tabBg,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 12 },
    }),
  },
  tabTopLine: {
    height: 2,
    backgroundColor: C.accent,
    width: 48,
    borderRadius: 1,
    alignSelf: "center",
    marginTop: 6,
    marginBottom: 2,
    opacity: 0.25,
  },
  tabRow: {
    height: 60, // Fixed height for tab bar content
    flexDirection: "row",
    paddingHorizontal: 4,
  },

  // Backdrop
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(26,20,16,0.5)",
    zIndex: 10,
  },

  // Sidebar
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 20,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 6, height: 0 }, shadowOpacity: 0.18, shadowRadius: 16 },
      android: { elevation: 16 },
    }),
  },
  sidebarContent: {
    flex: 1,
    backgroundColor: C.card,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: C.accentSoft,
  },
  brandRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 14 },
  brandLogo: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogoText: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  brandName: { fontSize: 20, fontWeight: "800", color: C.ink, letterSpacing: -0.3 },
  brandSub: { fontSize: 11, color: C.ink3, fontWeight: "500", marginTop: 1 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },

  // Divider
  divider: { height: 1, backgroundColor: C.divider, marginHorizontal: 20 },

  // User card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.accentSoft,
    borderWidth: 2,
    borderColor: C.accentMid,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: { fontSize: 15, fontWeight: "700", color: C.accent },
  userName: { fontSize: 15, fontWeight: "700", color: C.ink, marginBottom: 4 },
  userRolePill: { flexDirection: "row", alignItems: "center", gap: 5 },
  userRoleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1a8f5c" },
  userRoleText: { fontSize: 11, color: C.ink3, fontWeight: "500" },

  // Nav section
  navSection: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  navSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.ink3,
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 6,
    marginBottom: 8,
  },

  // Footer
  sidebarFooter: { paddingHorizontal: 14, paddingBottom: 28 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.accentSoft,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 12,
  },
  logoutBtnDisabled: { backgroundColor: C.graySoft },
  logoutText: { fontSize: 15, fontWeight: "600", color: C.accent },
  versionText: { textAlign: "center", fontSize: 11, color: C.ink3, marginTop: 14 },
});