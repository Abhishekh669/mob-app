import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken } from "@/utils/storage/user.auth.storage";
import { TableValidation } from "@/utils/types/approval-request/approval-request.types";
import axios from "axios";

export const getAllApprovalRequest = async() =>{
    try {
        const user_token = await GetUserToken();
        if (!user_token) throw new Error('invalild user')
        const res = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/order-service/get-all-approval-requests`,{
             headers: {
                Authorization: `Bearer ${user_token}`,
            },
            withCredentials: true,
        })
        const data = res.data;
        if (!data?.success) {
            throw new Error(data?.error || "failed to get reqeusts")
        }
        const requests: TableValidation[] = data?.requests || [];
        return {
            success: true,
            requests
        }
    } catch (error) {
        const errMsg = getErrorMessage(error)
        return {
            success : false,
            error : errMsg,
        }
        
    }
}