export interface LoginUser{
    email : string;
    password : string;
}


export type Role =
  | "admin"
  | "manager"
  | "cashier"
  | "chef"
  | "waiter"
  | "delivery_staff"
  | "customer";

export type Gender = "male" | "other" | "female";

export interface User {
  id: string;
  email: string;
  gender: Gender;
  image: string;
  is_active: boolean;
  role: Role;
  name: string;
  phone: string;
  salary: number;
  created_at: Date;
  updated_at: Date;
}