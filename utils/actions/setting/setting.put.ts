import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken, RemoveUserToken } from "@/utils/storage/user.auth.storage";
import { RestaurantSettings } from "@/utils/types/setting/setting.types";
import axios from "axios";

export const updatePassword = async (oldPassword : string, newPassword : string) => {
    try {
        const user_token = await GetUserToken();
        if (!user_token) throw new Error("unauthorized user")
        const res = await axios.put(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/user-service/update-user-password`, {
            new_password : newPassword,
            old_password : oldPassword
        }, {

            headers: {
                Authorization: `Bearer ${user_token}`,
            },
            withCredentials: true

        })

         const data = res.data;

        if (!data?.success) {
            throw new Error(data?.error || "Failed to update password");
        }
        const status = await RemoveUserToken();
        if(!status){
            console.error("Failed to delete user token cookie after password update");
        }

        return {
            success: true,
            message: data?.message || "Password updated successfully"
        }

    } catch (error) {
        console.log("error in fetching restaurant information : ", getErrorMessage(error))
        return {
            success: false,
            error
        }
    }
}