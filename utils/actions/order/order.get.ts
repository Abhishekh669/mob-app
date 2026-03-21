import axios from "axios"
import { getErrorMessage } from "@/utils/helper/get-error-message"
import { CustomerOrderRequest } from "@/utils/types/order/order.types";
import { GetUserToken } from "@/utils/storage/user.auth.storage";




export const getOrdersStatus = async () => {
    try {
         const user_token = await GetUserToken();
        if (!user_token) throw new Error("unauthorized user")
        const res = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/order-service/get-orders-status`, {

                headers: {
                    Authorization: `Bearer ${user_token}`,
                },
                withCredentials: true

            })
        const data = res.data;
        if (!data?.success) {
            throw new Error(data?.error || "failed to get reqeusts")
        }
        const order_requests: CustomerOrderRequest[] = data?.order_requests || [];
        return {
            success: true,
            order_requests
        }
    } catch (error) {
        const errMsg = getErrorMessage(error)
        return {
            success: false,
            error: errMsg
        }
    }
}



export const getOrderRequestsFromPhoneNTableNum = async (tableNumber: number, phone: string) => {
    try {
        if (!tableNumber || !phone) {
            throw new Error("invalid payload")
        }

        const res = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/order-service/get-request-by-table-num-n-phone?phone=${phone}&table_number=${tableNumber}`)
        const data = res.data;
        if (!data?.success) {
            throw new Error(data?.error || "failed to get reqeusts")
        }
        const order_request: CustomerOrderRequest = data?.order_request;
        return {
            success: true,
            order_request
        }
    } catch (error) {
        const errMsg = getErrorMessage(error)
        return {
            success: false,
            error: errMsg
        }
    }
}

export const getOrderRequestsByTableId = async (tableId: string) => {
    try {
        if(!tableId)throw new Error("invalid payload")
        const user_token = await GetUserToken();
    console.log("this is user token in request by table id : ", user_token)
        if (!user_token) throw new Error("unauthorized user")
        const res = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/order-service/get-request-by-table-session-id/${tableId}`,
            {

                headers: {
                    Authorization: `Bearer ${user_token}`,
                },
                withCredentials: true

            })
        const data = res.data;
        if (!data?.success) {
            throw new Error(data?.error || "failed to get reqeusts")
        }
        const order_request: CustomerOrderRequest = data?.order_request;
        return {
            success: true,
            order_request
        }
    } catch (error) {
        const errMsg = getErrorMessage(error)
        console.log("this is hte error in by order : ", errMsg)
        return {
            success: false,
            error: errMsg
        }
    }
}


export const getOrderRequests = async () => {
    try {
        const res = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/order-service/get-order-requests`)
        const data = res.data;
        if (!data?.success) {
            throw new Error(data?.error || "failed to get reqeusts")
        }
        const order_requests: CustomerOrderRequest[] = data?.order_requests || [];
        return {
            success: true,
            order_requests
        }
    } catch (error) {
        const errMsg = getErrorMessage(error)
        return {
            success: false,
            error: errMsg
        }
    }
}