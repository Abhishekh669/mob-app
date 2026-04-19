import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken, RemoveUserToken } from "@/utils/storage/user.auth.storage";
import axios from "axios";

export const createForgetPassword = async (email : string) =>{
    try {
        const response = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/user-service/create-forget-password-session`, {
            email
        })
        const data = response.data;

        const token = data?.token;
        if (!data?.success || !token) {
            throw new Error(data?.error || "Failed to create forget password session");
        }

        return {
            success: true,
            token,
            message: data?.message || "Forget password session created successfully"
        }
    } catch (error) {
            error = getErrorMessage(error);
            return {
                success: false,
                error: String(error)
            }
    }
}


export const getForgetPasswordSession = async(email : string, token : string) => {
    try {
         const res = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/user-service/get-forget-password-session?email=${email}&token=${token}`)
            const data = res.data;
            console.log("thisish te data in getforget password sesison : ", data)
            const session = data?.session;
        if (!data?.success || !session) {
            throw new Error(data?.error || "Failed to create forget password session");
        }

        return {
            success: true,
            message: data?.message || "Forget password session created successfully"
        }
    } catch (error) {
            error = getErrorMessage(error);
            console.log("Error in getForgetPasswordSession: ", error);
            throw new Error(error as string)
    }
}


export interface CheckForgetPasswrodType {
    
    email: string;
    pin : string;
    token : string;
    new_password : string;
}
export const checkForgetPasswordPin = async (checkindata : CheckForgetPasswrodType) => {
    try {
        const res = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/user-service/check-forget-password-pin`, {
            email: checkindata.email,
            token: checkindata.token,
            pin: checkindata.pin,
            new_password: checkindata.new_password
        })
        const data = res.data;
        if (!data?.success) {
            throw new Error(data?.error || "Failed to verify pin");
        }

        const user_token = await GetUserToken();
        if(user_token){
            await RemoveUserToken();
        }

        return {
            success: true,
            message: data?.message || "Pin verified successfully"
        }
    } catch (error) {
            error = getErrorMessage(error);
            return {
                error, 
                success : false,
            }
    }
}