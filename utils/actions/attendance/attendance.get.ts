import { getErrorMessage } from "@/utils/helper/get-error-message";
import { GetUserToken } from "@/utils/storage/user.auth.storage";
import { AttendanceLeaveResponse, AttendanceStatus } from "@/utils/types/attendance/attendance.types"
import axios from "axios";

interface GetTodayAttendanceType {
    status : AttendanceStatus
    success : boolean;
    error ?: any;
    attendance ?: AttendanceLeaveResponse
} 

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