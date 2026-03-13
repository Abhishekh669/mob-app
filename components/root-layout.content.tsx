import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useUserStore } from "@/utils/store/user/use-user-store";
import { useGetUserFromToken } from "@/hooks/tanstack/query-hook/user/use-get-user-from-token";

export default function RootLayoutContent() {
  const scheme = useColorScheme();
  const { setUser } = useUserStore();
  const { data, isLoading, isError } = useGetUserFromToken();

  useEffect(() => {
    if (data?.user) {
      setUser(data.user);
    }
    
    if (isError) {
      // Handle error case - maybe clear user?
      console.log("Error fetching user from token");
    }
  }, [data, isError, setUser]);

  // Optional: Show loading state if needed
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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