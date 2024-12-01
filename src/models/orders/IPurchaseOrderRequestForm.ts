interface ICartProduct {
    product_id: number;
    weight: number;
    price: number;
    product_units_info: any;
    subtotal: number;
    tax_1_percentage: number;
    tax_1_amount: number;
    tax_2_percentage: number;
    tax_2_amount: number;
    tax_3_percentage: number;
    tax_3_amount: number;
    discount: number;
    total_tax: number;
    total: number;
}

export interface IPurchaseOrderRequestForm {
    po_reference: string;
    delivery_date: string; // Use string if date is represented in ISO format, otherwise Date
    company_name: string;
    order_date: string; // Use string if date is represented in ISO format, otherwise Date
    vendor_id: number;
    sale_representative_id: number;
    purchaser_name: string;
    payment_terms: string;
    remarks: string;
    show_company_detail: boolean;
    products: ICartProduct[];
    order_total: number;
    order_tax_percentage?: number;
    order_tax_amount?: number;
    order_discount?: number;
    order_total_tax?: number;
    order_total_discount?: number;
    order_subtotal?: number;
    created_by_user_id?: number;
}
