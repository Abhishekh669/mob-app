import { getTodayAttendance } from "@/utils/actions/attendance/attendance.get";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const  fetchTodayAttendance = async () => {
  const res = await getTodayAttendance();
  return res;
}

export const useGetTodayAttendance = () => {
  return useQuery({
    queryKey: ["get-today-attendance"],
    queryFn:  fetchTodayAttendance,
    placeholderData: keepPreviousData,
  });
}