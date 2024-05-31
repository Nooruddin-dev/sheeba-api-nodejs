export interface IProductRequestForm {
    productId?: number;
    productName: string;
    shortDescription?: string;
    sku: string;
    stockQuantity: number;
    isActive: boolean;
    price?: number;

  
    createByUserId?: number;

}