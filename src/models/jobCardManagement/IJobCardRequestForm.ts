interface IJobCardProduct {
    job_card_product_id?: number;
    job_card_id?: number;
    product_id: number;
    product_code: number;
    quantity: number;
   
}

export interface IJobCardRequestForm {
    job_card_id?: number,
    order_date?: string; // Assuming date as string format
    dispatch_date?: string; // Assuming date as string format
    company_name?: string;
    product_name?: string;
    weight_qty?: number;
    job_size?: string;

    job_card_dispatch_info?: any;

    micron?: string;
    sealing_method?: string;
    job_card_reference?: string;
    po_reference?: string;
    special_request?: string;

    card_rate?: number;
    card_amount?: number;


    card_tax_type?: string,
    card_tax_value?: number,
    card_tax_amount?: number,


    card_total_amount?: number;


    jobCardAllProducts: IJobCardProduct[];

    createByUserId?: number;
}
