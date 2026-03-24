import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken, RemoveUserToken } from "@/utils/storage/user.auth.storage";
import { User } from "@/utils/store/user/use-user-store";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
type VerifyUserResult =
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated"; user: null }
  | { status: "error"; user: null };

export const verifyUserToken = async (): Promise<VerifyUserResult> => {
  try {
    const token = await GetUserToken();
    if (!token) {
      return { status: "unauthenticated", user: null };
    }

    const res = await axios.get(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/user-service/get-user-from-token`,
      {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      }
    );

    const data = res.data;

    if (!data.success || !data.user) {
      return { status: "unauthenticated", user: null };
    }

    return { status: "authenticated", user: data.user as User };

  } catch (error) {
    console.log("verifyUserToken error:", getErrorMessage(error));

    if (axios.isAxiosError(error)) {
      // 🌐 Network error (no response)
      if (!error.response) {
        return { status: "error", user: null };
      }

      const status = error.response.status;

      // 🔐 Unauthorized → logout
      if (status === 401 || status === 403) {
        await RemoveUserToken();
        return { status: "unauthenticated", user: null };
      }

      // 💥 Server error
      return { status: "error", user: null };
    }

    return { status: "error", user: null };
  }
};
export const useGetUserFromToken = () => {
  return useQuery({
    queryKey: ["get-user-from-token"],
    queryFn: verifyUserToken,
  });
};