export interface IJobProductionEntryForm {
    production_entry_id?: number,
    job_card_id?: number; 
    machine_id: number;
    job_card_product_id?: number;
    waste_value?: number;
    net_value?: number;
    gross_value?: string;


    createByUserId?: number;
}
