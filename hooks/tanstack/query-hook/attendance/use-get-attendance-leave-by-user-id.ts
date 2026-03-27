import { getAttendanceLeaveHistoryByUserId } from "@/utils/actions/attendance/attendance.get";
import { AttendanceLeaveQuery } from "@/utils/types/attendance/attendance.types";
import { useQuery } from "@tanstack/react-query";

export const  fetchAttendanceLeaveHistoryByUserId = async (query : AttendanceLeaveQuery) => {
  const res = await getAttendanceLeaveHistoryByUserId(query);
  return res;
}

export const useGetAttendanceLeaveHistoryByUserId = (query : AttendanceLeaveQuery) => {
  return useQuery({
    queryKey: ["get-attendance-leave-history-by-user-id", query],
    queryFn:  ()=> fetchAttendanceLeaveHistoryByUserId(query),
    enabled : !!query
  });
}