interface ICartProduct {
    productid: number;
    weight_value: number;
    price: number;

    product_units_info: any;


    product_tax_rule_id: number;
    itemTaxPercent: number;
    itemTotalTax: number;
    tax_value?: number;
    tax_rate_type?: any
    itemTotal: number;
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
    cartAllProducts: ICartProduct[];
    orderTotal: number;

    orderLevelTaxRateType?: number;
    orderLevelTaxValue?: number;
    orderLevelTaxAmount?: number;

    createByUserId?: number;
}
