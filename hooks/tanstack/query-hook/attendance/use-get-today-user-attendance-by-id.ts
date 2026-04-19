import { getTodayAttendanceByUserId } from "@/utils/actions/attendance/attendance.get";
import { useQuery } from "@tanstack/react-query";

export const  fetchTodayAttendanceByUserId = async () => {
  const res = await getTodayAttendanceByUserId();
  return res;
}

export const useGetTodayAttendanceByUserId = () => {
  return useQuery({
    queryKey: ["get-today-attendance-by-user-id"],
    queryFn: fetchTodayAttendanceByUserId,
  });
}