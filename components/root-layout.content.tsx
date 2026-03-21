import { Slot, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useUserStore } from "@/utils/store/user/use-user-store";
import { useGetUserFromToken } from "@/hooks/tanstack/query-hook/user/use-get-user-from-token";

export default function RootLayoutContent() {
  const scheme = useColorScheme();
  const router = useRouter();
  const { setUser, logout } = useUserStore();
  const { data, isLoading } = useGetUserFromToken();

  useEffect(() => {
    if (!data) return;

    if (data.success && data.user) {
      // Valid token → hydrate the store
      setUser(data.user);
    } else {
      // success: false → token missing, invalid, or network failure
      // verifyUserToken already removed the token from SecureStore
      logout().then(() => {
        router.replace("/login");
      });
    }
  }, [data]);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: scheme === "dark" ? "#000" : "#fff",
        }}
        edges={["top"]}
      >
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Slot />
        <Toast />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}