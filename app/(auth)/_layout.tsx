import { Redirect, Slot } from "expo-router";
import React from "react";
import { useUserStore } from "@/utils/store/user/use-user-store";

export default function AuthLayout() {
  const { isAuthenticated } = useUserStore();

  // If user IS logged in → send them to main app, not login
  if (isAuthenticated) {
    return <Redirect href="/(main)/home" />;
  }

  return <Slot />; // Render login.tsx here
}