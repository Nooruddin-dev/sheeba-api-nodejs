

interface ICartGrnVoucherLineItems {
    product_id: number;
    order_line_item_id: number;
    product_sku_code: string;
    quantity: number;
    po_rate: number;
    amount: number;
 
    tax_percent: number;
    item_tax_amount_total: number;
    tax_value?: number;
    tax_rate_type?: any
    grn_item_total: number;
}

export interface IGrnVoucherCreateRequestForm {
    purchase_order_id: number;
    po_number: string;
    receiver_name: string;
    receiver_contact: string;
    grn_date: string; // Use string if date is represented in ISO format, otherwise Date
    show_company_detail: boolean;

    cartGrnVoucherLineItems: ICartGrnVoucherLineItems[];
    orderTotal: number;

    orderLevelTaxRateType?: number;
    orderLevelTaxValue?: number;
    orderLevelTaxAmount?: number;

    createByUserId?: number;
}

