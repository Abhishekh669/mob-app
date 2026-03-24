import { getErrorMessage } from "@/utils/helper/get-error-message"
import { GetUserToken } from "@/utils/storage/user.auth.storage";
import { UpdateAttendaceRequest } from "@/utils/types/attendance/attendance.types";
import axios from "axios";

export const cancelUserAttendanceRequest = async(id : string) =>{
    try {
           const user_token = await GetUserToken();
        if (!user_token) throw new Error('invalild user')
        const res = await axios.put(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/attendance-service/leave/${id}/cancel`, {}, {
            headers: {
                Authorization: `Bearer ${user_token}`,
            },
            withCredentials: true,
        })
        const data = res.data;
        if (!data?.success) {
            throw new Error(data?.error || "failed to cancel request")
        }
        
        return {
            success: true,
            message: data?.message || "successfully cancelled request"
        }
    } catch (error) {
        const errMsg = getErrorMessage(error)
        return {
            error : errMsg, 
            success : false,
        }
        
    }
}


export const UpdateUserAttendanceRequest = async(updateData : UpdateAttendaceRequest) =>{
    try {
           const user_token = await GetUserToken();
        if (!user_token) throw new Error('invalild user')
        const res = await axios.put(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/attendance-service/update-user-leave`, updateData, {
            headers: {
                Authorization: `Bearer ${user_token}`,
            },
            withCredentials: true,
        })
        const data = res.data;
        if (!data?.success) {
            throw new Error(data?.error || "failed to update request")
        }
        
        return {
            success: true,
            message: data?.message || "successfully update request"
        }
    } catch (error) {
        const errMsg = getErrorMessage(error)
        return {
            error : errMsg, 
            success : false,
        }
        
    }
}

