// Using UUID type from a library or as string
type UUID = string;

export type orderStatus = "approved" | "not-approved" | "progress" | "completed" | "cancelled"


export interface OrderItemType {
  id: UUID;
  price: number;
  quantity: number;
  order_id: UUID;
  menu_id: UUID;
  menu_image: string | null;
  status : orderStatus;
  menu_name: string;
  created_at : string;
}

export interface TableSession {
  id: UUID;
  table_number: number;
  open_time: string; // ISO date string (e.g., "2024-01-20T10:30:00Z")
  close_time: string | null;
  status: 'occupied' | 'empty' | 'booked'; // Based on your table_state enum
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface CustomerOrderRequest {
  table_session: TableSession;
  customer_name: string | null;
  customer_phone: string | null;
  id : string;
  status : orderStatus;
  note: string | null;
  order_items: OrderItemType[];
}

export interface UpdateOrderItemType {
  status : orderStatus
  order_id : string;
  order_item_id : string;
}