import { Pool } from 'mysql2/promise';
import connectionPool from '../configurations/db';
import { IProductRequestForm } from '../models/inventory/IProductRequestForm';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { InsertUpdateDynamicColumnMap } from '../models/dynamic/InsertUpdateDynamicColumnMap';
import { dynamicDataInsertService, dynamicDataUpdateService } from './dynamic.service';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';

class InventoryService {

    public async insertUpdateProductService(formData: IProductRequestForm): Promise<ServiceResponseInterface> {

        let response: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        try {

            const tableName = 'Products';
            const primaryKeyName = 'ProductId';

            if (formData.productId != undefined && formData.productId != null && formData.productId > 0) {
                const primaryKeyValue = formData.productId;

                const columns: any = {
                    productName: formData.productName,
                    shortDescription: formData.shortDescription,
                    sku: formData.sku,
                    stockQuantity: formData.stockQuantity,
                    isActive: formData.isActive == true || formData?.isActive?.toString() == 'true' || formData?.isActive?.toString() == '1' ? 1 : 0,
                    price: formData.price,
                    updatedOn: new Date(),
                    updatedBy: formData.createByUserId,

                };


                response = await dynamicDataUpdateService(tableName, primaryKeyName, primaryKeyValue, columns);


            } else {

                const primaryKeyValue = null; // null since it's auto-incremented
                const isAutoIncremented = true;

                
                const columns: any = {
                    productName: formData.productName,
                    shortDescription: formData.shortDescription,
                    sku: formData.sku,
                    stockQuantity: formData.stockQuantity,
                    isActive: formData.isActive == true || formData?.isActive?.toString() == 'true' || formData?.isActive?.toString() == '1' ? 1 : 0,
                    price: formData.price,
                    createdOn: new Date(),
                    createdBy: formData.createByUserId,
                    isBoundToStockQuantity: false,
                    displayStockQuantity: false

                };

                response = await dynamicDataInsertService(tableName, primaryKeyName, primaryKeyValue, isAutoIncremented, columns);
                
            }


        } catch (error) {
            console.error('Error executing insert/update proudct details:', error);
            throw error;
        }

        return response;
    }


    public async getAllProductsService(FormData: any): Promise<any> {

        const connection = await connectionPool.getConnection();

        try {



            let searchParameters = '';

            if (FormData.productId > 0) {
                searchParameters += ` AND MTBL.productId = ${FormData.productId}`;
            }

            if (stringIsNullOrWhiteSpace(FormData.sku) == false) {
                searchParameters += ` AND MTBL.sku = '${FormData.sku}' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.productName) == false) {
                searchParameters += ` AND MTBL.productName LIKE '%${FormData.productName}%' `;
            }



            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*
                FROM PRODUCTS MTBL
                WHERE MTBL.productId IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.productId DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
            `);

            const userData: any = results;
            return userData;

        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }


}

export default InventoryService;
