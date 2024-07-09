interface IJobCardProduct {
    job_card_id?: number;
    product_id: number;
    product_code: number;
    quantity: number;
   
}

export interface IJobCardRequestForm {
    order_date?: string; // Assuming date as string format
    dispatch_date?: string; // Assuming date as string format
    company_name?: string;
    product_name?: string;
    weight_qty?: number;
    job_size?: string;
    materials?: string;
    micron?: string;
    sealing_method?: string;
    job_card_reference?: string;
    special_request?: string;
    dispatch_place?: string;
    distribution?: string;
    card_rate?: number;
    card_amount?: number;


    card_tax_type?: string,
    card_tax_value?: number,
    card_tax_amount?: number,


    card_total_amount?: number;


    jobCardAllProducts: IJobCardProduct[];

    createByUserId?: number;
}
