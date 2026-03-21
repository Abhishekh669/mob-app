import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken, RemoveUserToken } from "@/utils/storage/user.auth.storage";
import { User } from "@/utils/store/user/use-user-store";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type VerifyUserResult =
  | { success: true; user: User }
  | { success: false; user: null };

export const verifyUserToken = async (): Promise<VerifyUserResult> => {
  try {
    const token = await GetUserToken();

    // No token stored → treat as unauthenticated, not an error
    if (!token) {
      return { success: false, user: null };
    }

    const res = await axios.get(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/user-service/get-user-from-token`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      }
    );

    const data = res.data;

    if (!data.success || !data.user) {
      // Backend says token is invalid → remove it from storage
      await RemoveUserToken();
      console.log("verifyUserToken: backend reported invalid user:", data?.error);
      return { success: false, user: null };
    }

    const user: User = data.user;
    return { success: true, user };
  } catch (error) {
    const errMsg = getErrorMessage(error);
    console.log("verifyUserToken error:", errMsg);
    // Network / parsing failure → remove potentially bad token
    await RemoveUserToken();
    return { success: false, user: null };
  }
};

export const useGetUserFromToken = () => {
  return useQuery({
    queryKey: ["get-user-from-token"],
    queryFn: verifyUserToken,
    refetchOnWindowFocus: true,
  });
};