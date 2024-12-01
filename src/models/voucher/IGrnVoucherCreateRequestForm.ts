

interface ICartGrnVoucherLineItems {
    product_id: number;
    order_line_item_id: number;
    product_sku_code: string;
    quantity: number;
    weight: number;
    cost: number;
    cost_inclusive: number;
    total: number;
}

export interface IGrnVoucherCreateRequestForm {
    purchase_order_id: number;
    po_number: string;
    receiver_name: string;
    receiver_contact: string;
    grn_date: string; // Use string if date is represented in ISO format, otherwise Date
    show_company_detail: boolean;
    products: ICartGrnVoucherLineItems[];
    total: number;
    subtotal: number;
    created_by_user_id?: number;
}

