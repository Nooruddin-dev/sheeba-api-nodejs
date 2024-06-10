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


            debugger
            const tableName = 'Products';
            const primaryKeyName = 'productid';

            if (formData.productid != undefined && formData.productid != null && formData.productid > 0) {
                const primaryKeyValue = formData.productid;

                const columns: any = {
                    product_name: formData.product_name,
                    short_description: formData.short_description,
                    sku: formData.sku,
                    stockquantity: formData.stockquantity,
                    is_active: formData.is_active == true || formData?.is_active?.toString() == 'true' || formData?.is_active?.toString() == '1' ? 1 : 0,
                    price: formData.price,
                    unit_id: formData.unit_id,
                    size: formData.size,
                    updated_on: new Date(),
                    updated_by: formData.createByUserId,

                };


                response = await dynamicDataUpdateService(tableName, primaryKeyName, primaryKeyValue, columns);


            } else {

                const primaryKeyValue = null; // null since it's auto-incremented
                const isAutoIncremented = true;


                const columns: any = {
                    product_name: formData.product_name,
                    short_description: formData.short_description,
                    sku: formData.sku,
                    stockquantity: formData.stockquantity,
                    is_active: formData.is_active == true || formData?.is_active?.toString() == 'true' || formData?.is_active?.toString() == '1' ? 1 : 0,
                    price: formData.price,
                    unit_id: formData.unit_id,
                    size: formData.size,
                    created_on: new Date(),
                    created_by: formData.createByUserId,
                    is_bound_to_stock_quantity: false,
                    display_stock_quantity: false

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

            if (FormData.productid > 0) {
                searchParameters += ` AND MTBL.productid = ${FormData.productid}`;
            }

            if (stringIsNullOrWhiteSpace(FormData.sku) == false) {
                searchParameters += ` AND MTBL.sku = '${FormData.sku}' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.product_name) == false) {
                searchParameters += ` AND MTBL.product_name LIKE '%${FormData.product_name}%' `;
            }



            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*
                FROM PRODUCTS MTBL
                WHERE MTBL.productid IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.productid DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
            `);

            const finalData: any = results;
            return finalData;

        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    public async getProductsListBySearchTermService(FormData: any): Promise<any> {

        const connection = await connectionPool.getConnection();

        try {


            const searchQueryProduct = FormData?.searchQueryProduct;
            let searchParameters = '';

            if (FormData.productid > 0) {
                searchParameters += ` AND MTBL.productid = ${FormData.productid}`;
            }

            if (stringIsNullOrWhiteSpace(FormData.sku) == false) {
                searchParameters += ` AND MTBL.sku = '${FormData.sku}' `;
            }

            if (stringIsNullOrWhiteSpace(searchQueryProduct) == false) {
                searchParameters += ` AND ( MTBL.productid LIKE '%${searchQueryProduct}%' OR
                     MTBL.product_name LIKE '%${searchQueryProduct}%' OR
                     MTBL.SKU LIKE '%${searchQueryProduct}%' )`;
            }



            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*
                FROM PRODUCTS MTBL
                WHERE MTBL.productid IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.productid DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
            `);

            const finalData: any = results;
            return finalData;

        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    public async getProductDetailByIdApi(productid: number): Promise<any> {

        const connection = await connectionPool.getConnection();

        try {



            const [results]: any = await connection.query(`
                SELECT MTBL.*
                FROM PRODUCTS MTBL
                WHERE MTBL.productid  = ${productid};`);

            if (results) {
                const finalData: any = results[0];
                return finalData;
            } else {
                const finalData: any = {};
                return finalData;
            }


        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }


    public async getTaxRulesService(FormData: any): Promise<any> {

        const connection = await connectionPool.getConnection();

        try {



            let searchParameters = '';

            if (FormData.machine_id > 0) {
                searchParameters += ` AND mtbl.tax_rule_id = ${FormData.tax_rule_id}`;
            }

            if (stringIsNullOrWhiteSpace(FormData.tax_rule_type) == false) {
                searchParameters += ` AND mtbl.tax_rule_type LIKE '%${FormData.tax_rule_type}%' `;
            }



            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as totalRecords, mtbl.*, tc.category_name
                FROM tax_rules mtbl
                INNER JOIN tax_categories tc on tc.tax_category_id = mtbl.tax_category_id
                WHERE mtbl.tax_rule_id IS NOT NULL
                ${searchParameters}
                ORDER BY mtbl.tax_rule_id DESC
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

    public async getUnitsListService(FormData: any): Promise<any> {

        const connection = await connectionPool.getConnection();

        try {

            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as totalRecords, mtbl.*
                FROM units mtbl
                WHERE mtbl.unit_id IS NOT NULL
                ORDER BY mtbl.unit_id ASC
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
