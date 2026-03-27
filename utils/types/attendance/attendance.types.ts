import { ExpoRoot } from "expo-router";

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

export interface AttendanceLeaveQuery {
    fromDate ?: Date;
    toDate ?: Date;
    limit ?: number;
    page ?: number;
    status ?: LeaveStatus
}


export  interface AttendanceLeaveByUserStats {
  total_requests : number;
  pending_requests : number;
  approved_requests : number;
  rejected_requests : number;
}

export interface AttendanceLeaveByUserResponse {
  requests : AttendanceLeaveResponse[],
  total : number;
  has_more : boolean;
  next_offset : number;
  stats : AttendanceLeaveByUserStats
}