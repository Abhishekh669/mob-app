import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

/** SDK 53+: `expo-notifications` is not supported in Expo Go (import/use throws). */
export function isStaffAlertNotificationsAvailable(): boolean {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

type NotificationsModule = typeof import("expo-notifications");

let handlerConfigured = false;
let channelEnsured = false;
/** `undefined` = not attempted yet; `null` = unavailable (Expo Go, web, failed import) */
let notificationsModule: NotificationsModule | null | undefined;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!isStaffAlertNotificationsAvailable()) {
    notificationsModule = null;
    return null;
  }
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = await import("expo-notifications");
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

async function ensureNotificationSetup(Notifications: NotificationsModule) {
  if (handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

async function ensureAndroidChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== "android" || channelEnsured) return;
  await Notifications.setNotificationChannelAsync("staff-alerts", {
    name: "Staff alerts",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 220, 120, 220],
  });
  channelEnsured = true;
}

export async function requestStaffAlertPermissions(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  await ensureNotificationSetup(Notifications);
  await ensureAndroidChannel(Notifications);

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === "granted";
}

export async function presentStaffAlert(
  title: string,
  body: string,
  playSound: boolean
): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  await ensureNotificationSetup(Notifications);
  await ensureAndroidChannel(Notifications);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: playSound ? "default" : undefined,
        ...(Platform.OS === "android" ? { channelId: "staff-alerts" } : {}),
      },
      trigger: null,
    });
  } catch {
    // Permission denied or simulator limitation — ignore
  }
}
