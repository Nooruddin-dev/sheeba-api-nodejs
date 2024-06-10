export interface IProductRequestForm {
    productid?: number;
    product_name: string;
    short_description?: string;
    sku: string;
    stockquantity: number;
    is_active: boolean;
    price?: number;
    unit_id: number;
    size: number;

  
    createByUserId?: number;

}