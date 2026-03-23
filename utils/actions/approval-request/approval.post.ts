import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken } from "@/utils/storage/user.auth.storage";
import { ApproveRequestType } from "@/utils/types/approval-request/approval-request.types";
import axios from "axios";

export const ApproveCustomerRequest = async(updatedData : ApproveRequestType) =>{
    try {
         const user_token = await GetUserToken();
        if (!user_token) throw new Error('invalild user')
        const res = await axios.put(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/order-service/table-approve-by-waiter`, updatedData, {
            headers: {
                Authorization: `Bearer ${user_token}`,
            },
            withCredentials: true,
        })
        const data = res.data;
        if (!data?.success) {
            throw new Error(data?.error || "failed to approve request")
        }
        
        return {
            success: true,
            message: data?.message || "successfully approved request"
        }
    } catch (error) {
        const errMsg = getErrorMessage(error)
        return {
            success : false,
            error : errMsg
        }
        
    }
}

