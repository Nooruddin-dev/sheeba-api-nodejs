export interface IJobCardDispatchInfoForm {
    job_card_id: string;      // or number, depending on the actual data type
    company_name: string;
    po_number: string;
    tr_number: string;
    item_name: string;
    show_company_detail: any;
    deliveryChallanLineItems: any;
    createByUserId?: number;
}
