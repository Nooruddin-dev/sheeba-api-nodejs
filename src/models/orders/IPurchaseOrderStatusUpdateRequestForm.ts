

export interface IPurchaseOrderStatusUpdateRequestForm {
    purchase_order_id: number;
    status_id: number; 

    createByUserId?: number;
}