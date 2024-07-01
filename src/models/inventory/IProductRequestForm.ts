
 interface IUnitSubTypeRoll {
    unit_sub_type: string;
    unit_id?: number;
    unit_value: string;
    unit_type?: number; 
    unit_type_name: string;
}


export interface IProductRequestForm {
    productid?: number;
    product_name: string;
    short_description?: string;
    sku: string;
    stockquantity: number;
    is_active: boolean;
    price?: number;

    unit_type?: number;

    unitSubTypesRoll?: IUnitSubTypeRoll[],
  
    createByUserId?: number;

}