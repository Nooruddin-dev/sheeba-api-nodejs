interface ICartProduct {
    productid: number;
    quantity: number;
    price: number;
    product_tax_rule_id: number;
    itemTaxPercent: number;
    itemTotalTax: number;
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
    cartAllProducts: ICartProduct[];
    orderTotal: number;
    orderLevelTaxRuleId: number;
    orderLevelTaxAmount: number;

    createByUserId?: number;
}
