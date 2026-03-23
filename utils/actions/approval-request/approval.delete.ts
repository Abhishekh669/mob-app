import { getErrorMessage } from "@/utils/helper/get-error-message"
import { GetUserToken } from "@/utils/storage/user.auth.storage";
import axios from "axios";

export const deleteApprovalRequest = async(id : string) =>{
    try {
          const user_token = await GetUserToken();
        if (!user_token) throw new Error('invalild user')
        const res = await axios.delete(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/order-service/table-delete/${id}`, {
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
            error : errMsg,
        }
        
    }
}