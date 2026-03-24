import { getErrorMessage } from "@/utils/helper/get-error-message"
import { GetUserToken } from "@/utils/storage/user.auth.storage";
import { CreateAttendanceLeave } from "@/utils/types/attendance/attendance.types";
import axios from "axios";

export  const createAttendaceLeave  = async(attendanceLeave : CreateAttendanceLeave) =>{
    try {
          const user_token = await GetUserToken();
        if (!user_token) throw new Error('invalild user')
        const res = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/attendance-service/leave`, attendanceLeave, {
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
            error : errMsg,
            success : false
        }
        
    }
}
