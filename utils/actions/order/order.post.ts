import { ApproveOrderType } from "@/app/(main)/order-request/[table-session]";
import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken } from "@/utils/storage/user.auth.storage";
import axios from "axios";

export const approveOrder = async (approveOrderData: ApproveOrderType) => {
    try {
        const user_token = await GetUserToken();
        if (!user_token) throw new Error('invalild user')
        const res = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/order-service/approve-order`, approveOrderData, {
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
            success: true,
            message: data?.message || "successfully approved roder"
        }
    } catch (error) {
        const errMsg = getErrorMessage(error)
        return {
            success: false,
            error: errMsg
        }
    }
}