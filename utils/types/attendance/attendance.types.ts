export interface CreateAttendanceLeave {
    employee_id : string;
    start_date : Date;
    end_date : Date;
    message : string;
}

export type LeaveStatus = "pending" | "approved" | "rejected";
export type  AttendanceStatus = "attendance_exist" | "attendance_unexist"  | "attendance_error"

export interface AttendanceLeaveResponse {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_image?: string | null;
  checked_by?: string | null;
  start_date: string;   // ISO date string
  end_date: string;     // ISO date string
  message: string;
  supervisor_message?: string | null;
  status: LeaveStatus;
  created_at: string;   // ISO date string
  updated_at: string;   // ISO date string
}


export interface UpdateAttendaceRequest {
   id : string;
   employee_id : string;
   start_date : Date;
   end_date : Date;
   message : string;
}