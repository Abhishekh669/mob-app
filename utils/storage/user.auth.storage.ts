import * as SecureStore from "expo-secure-store";


export const USER_ACCESS_TOKEN = "user_access_token";

export const StoreUserToken = async (token: string): Promise<boolean> => {
  try {
    if (!token) throw new Error("invalid token");

    await SecureStore.setItemAsync(USER_ACCESS_TOKEN, token);

    return true;
  } catch (error) {
    console.log("error storing user token:", error);
    return false;
  }
};

export const GetUserToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(USER_ACCESS_TOKEN);
  } catch (error) {
    console.log("error getting user token:", error);
    return null;
  }
};

export const RemoveUserToken = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(USER_ACCESS_TOKEN);

    return true;
  } catch (error) {
    console.log("error removing user token:", error);
    return false;
  }
};
