import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken } from "@/utils/storage/user.auth.storage";
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
      // Backend says user is not valid → also treat as unauthenticated
      console.log(
        "verifyUserToken: backend reported invalid user:",
        data?.error
      );
      return { success: false, user: null };
    }

    console.log("this is the data in verify user : ", data);
    const user: User = data.user;

    return {
      user,
      success: true,
    };
  } catch (error) {
    const errMsg = getErrorMessage(error);
    console.log("this ishte error in verifying user : ", errMsg);

    // Network / parsing / other failure → do NOT throw,
    // just log and treat as unauthenticated so we don't
    // cause repeated error-driven re-renders.
    return { success: false, user: null };
  }
};

export const useGetUserFromToken = () => {
  return useQuery({
    queryKey: ["get-user-from-token"],
    queryFn: verifyUserToken,
    refetchOnWindowFocus: true, // refresh on tab focus
  });
};

