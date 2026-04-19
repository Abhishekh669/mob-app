import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken } from "@/utils/storage/user.auth.storage";
import { RestaurantSettings } from "@/utils/types/setting/setting.types";
import axios from "axios";

export const getRestaurantInformation = async () => {
    try {
        const user_token = await GetUserToken();
        if (!user_token) throw new Error("unauthorized user")
        const res = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/setting-service/restaurant-information`, {

            headers: {
                Authorization: `Bearer ${user_token}`,
            },
            withCredentials: true

        })

        const data = res.data;
        if (!data?.success) {
            throw new Error(data?.error)
        }

        var info: RestaurantSettings = data?.info;

        return {
            success: true,
            info
        }

    } catch (error) {
        console.log("error in fetching restaurant information : ", getErrorMessage(error))
        return {
            success: false,
            error
        }
    }
}