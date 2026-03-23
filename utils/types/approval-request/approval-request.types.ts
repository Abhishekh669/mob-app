export interface ApproveRequestType{
    id : string
    waiter_id : string;
    table_number : number;
    phone : string;
}

export interface TableValidation {
    id : string;
    table_number : number;
    phone_number : string;
    waiter_id ?: string;
    created_at : string;
    updated_at : string;
}