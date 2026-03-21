import { getErrorMessage } from "@/utils/helper/get-error-message"
import { GetUserToken } from "@/utils/storage/user.auth.storage";
import axios from "axios"

export const deleteTableSession = async(id : string) =>{
    try {
         const user_token = await GetUserToken();
        if (!user_token) throw new Error("unauthorized user")
        const res = await axios.delete(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/order-service/table-session-delete/${id}`, {

                headers: {
                    Authorization: `Bearer ${user_token}`,
                },
                withCredentials: true

            })
        const data = res.data;
        if(!data.success)throw new Error("failed to delete approval")
        return{
            success : true,
            message : data?.message || "successfully deleted"
        }

    } catch (error) {
        const errMsg = getErrorMessage(error)
        return {
            success : false,
            error : errMsg
        }
        
    }
}