import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken } from "@/utils/storage/user.auth.storage";
import { UpdateOrderItemType } from "@/utils/types/order/order.types";
import axios from "axios";

export const updateOrderItem = async(updateData : UpdateOrderItemType) =>{
    try {
        const user_token = await GetUserToken();
        if(!user_token)throw new Error("user not authorized")
            const res = await axios.put(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/order-service/update-order-item`, updateData, {
            headers: {
                Authorization: `Bearer ${user_token}`,
            },
            withCredentials: true,
        })
        const data = res.data;
        if (!data?.success) {
            throw new Error(data?.error || "failed to approve order")
        }
        return {
            success : data?.success as boolean || true,
            message : data?.message || "successfuly update  order"
        }
    } catch (error) {
        const errMsg = getErrorMessage(error)
        return {
            error : errMsg, 
            success : false,
        }
    }
}