import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken } from "@/utils/storage/user.auth.storage";
import { AttendanceLeaveByUserResponse, AttendanceLeaveQuery, AttendanceLeaveResponse, AttendanceStatus } from "@/utils/types/attendance/attendance.types"
import { queryOptions } from "@tanstack/react-query";
import axios from "axios";

interface GetTodayAttendanceType {
    status : AttendanceStatus
    success : boolean;
    error ?: any;
    attendance ?: AttendanceLeaveResponse
} 

// Update your API function to match backend query parameters
export const getAttendanceLeaveHistoryByUserId = async (query: AttendanceLeaveQuery) => {
    try {
        const user_token = await GetUserToken();
        if (!user_token) throw new Error('invalid user');

        // Format dates to YYYY-MM-DD for backend
        const formatDateForBackend = (date: Date) => {
            return date.toISOString().split('T')[0];
        };

        const params = new URLSearchParams();
        
        if (query.fromDate) {
            params.append('startingDate', formatDateForBackend(query.fromDate));
        }
        if (query.toDate) {
            params.append('endingDate', formatDateForBackend(query.toDate));
        }
        if (query.status) {
            params.append('status', query.status);
        }
        if (query.limit) {
            params.append('limit', query.limit.toString());
        }
        if (query.page) {
            params.append('page', (query.page - 1).toString()); // Backend expects 0-based page
        }

        const url = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/attendance-service/get-attendance-leave-history-by-user-id?${params.toString()}`;
        
        const res = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${user_token}`,
            },
            withCredentials: true,
        });

        const data = res.data;

        if (!data?.success) {
            throw new Error(data?.error || "error occurred");
        }

        // Transform backend response to match frontend types
        const attendance_leaves = data?.attendance_leaves;
        
        if (!attendance_leaves) throw new Error("No data received");
        
        return {
            success: true,
            attendance_leave_data: {
                requests: attendance_leaves.requests || [],
                total: attendance_leaves.total || 0,
                has_more: attendance_leaves.has_more || false,
                next_offset: attendance_leaves.next_offset || 0,
                stats: attendance_leaves.stats || {
                    total_requests: 0,
                    pending_requests: 0,
                    approved_requests: 0,
                    rejected_requests: 0,
                }
            } as AttendanceLeaveByUserResponse
        };

    } catch (error) {
        const errMsg = getErrorMessage(error);
        console.log("thisis hte error in attendance hsitory: ", errMsg)
        return {
            error: errMsg,
            success: false,
        };
    }
};

export const getTodayAttendance = async(): Promise<GetTodayAttendanceType> => {
    try {
        const user_token = await GetUserToken();
        if (!user_token) throw new Error('invalid user');

        const res = await axios.get(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/attendance-service/get-today-attendance`,
            {
                headers: {
                    Authorization: `Bearer ${user_token}`,
                },
                withCredentials: true,
            }
        );

        const data = res.data;

        if (!data?.success) {
            throw new Error(data?.error || "error occurred");
        }

        const status: AttendanceStatus = data.status;
        const attendance = data?.attendance as AttendanceLeaveResponse | undefined;

        if (!status) throw new Error("invalid response");

        if (status === "attendance_unexist") {
            return {
                status,
                success: true,
                attendance: undefined,
            };
        }

        return {
            status,
            success: true,
            attendance,
        };

    } catch (error) {
        const errMsg = getErrorMessage(error);

        return {
            status: "attendance_error",
            success: false,
            error: errMsg,
        };
    }
};