import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { RemoveUserToken } from "@/utils/storage/user.auth.storage"

export type Role =
  | "admin"
  | "manager"
  | "cashier"
  | "chef"
  | "waiter"
  | "delivery_staff"
  | "customer"

export type Gender = "male" | "other" | "female"

export interface User {
  id: string
  email: string
  gender: Gender
  image: string
  is_active: boolean
  role: Role
  name: string
  phone: string
  salary: number
  created_at: Date
  updated_at: Date
}

interface UserState {
  user: User | null
  isAuthenticated: boolean
  hasHydrated: boolean
  setUser: (user: User | null) => void
  updateUser: (data: Partial<User>) => void
  logout: () => Promise<void>
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
        }),

      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

      // Clears both the zustand store AND the SecureStore token
      logout: async () => {
        await RemoveUserToken();
        set({
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useUserStore.setState({ hasHydrated: true })
      },
    }
  )
)