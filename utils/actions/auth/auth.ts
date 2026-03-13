import { getErrorMessage } from "@/utils/helper/get-error-message";
import { StoreUserToken } from "@/utils/storage/user.auth.storage";
import { LoginUser, User } from "@/utils/types/user/user.types";
import axios from "axios";


export const loginUser = async (userLoginData: LoginUser) => {
    try {
        const res = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/user-service/login-user`, userLoginData)
        const data = res.data;
        console.log("thisis data of the user in loign : ", data)
        const user_token = data.token;
        const user_data : User = data.user;
        if(!data.success || !user_token || !user_data){
            throw new Error(data?.error || "failed to login user")
        }
        const status = await StoreUserToken(user_token)
        if(!status){
            throw new Error("failed to store user")
        }
        
        return {
            success : data.success,
            user : user_data,
            message : data.message || "logged in successfully",
        }
    } catch (error) {
        const err  = getErrorMessage(error)
        throw new Error(err)
    }
}