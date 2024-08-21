export interface IJobCardDispatchInfoForm {
    job_card_id: string;      // or number, depending on the actual data type
    item_name: string;
    total_bags: number;
    quantity: number;
    core_value: number;
    gross_value: number;
    net_weight: number;
    grand_total: number;
    card_tax_type: string;
    card_tax_value: number;
    show_company_detail: any;


    createByUserId?: number;
}
