import { Pool } from 'mysql2/promise';
import { connectionPool, withConnectionDatabase } from '../configurations/db';
import { IProductRequestForm } from '../models/inventory/IProductRequestForm';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { InsertUpdateDynamicColumnMap } from '../models/dynamic/InsertUpdateDynamicColumnMap';
import { dynamicDataGetByAnyColumnService, dynamicDataInsertService, dynamicDataUpdateService } from './dynamic.service';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { ProductionEntriesTypesEnum } from '../models/enum/GlobalEnums';

class InventoryService {

    public async insertUpdateProductService(formData: IProductRequestForm): Promise<ServiceResponseInterface> {






        let response: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        try {



            const tableName = 'products';
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

                    remaining_quantity: 0,
                    remaining_weight: 0,
                    
                    is_active: formData.is_active == true || formData?.is_active?.toString() == 'true' || formData?.is_active?.toString() == '1' ? 1 : 0,
                    price: formData.price,
                    unit_type: formData.unit_type,

                    weight_unit_id: formData.weight_unit_id,
                    weight_value: formData.weight_value,

                    created_on: new Date(),
                    created_by: formData.createByUserId,
                    is_bound_to_stock_quantity: false,
                    display_stock_quantity: false

                };


                response = await dynamicDataInsertService(tableName, primaryKeyName, primaryKeyValue, isAutoIncremented, columns);

                if (response && response.primaryKeyValue) {
                    const insertedProductId = response.primaryKeyValue;

                    if (formData.unitSubTypesAll && formData.unitSubTypesAll.length > 0) {

                        for (const element of formData.unitSubTypesAll) {

                            const columnsUnitSubTypesRollItem: any = {
                                productid: insertedProductId,
                                unit_type: element.unit_type,
                                unit_sub_type: element.unit_sub_type,
                                unit_id: element.unit_id,
                                unit_value: stringIsNullOrWhiteSpace(element.unit_value) ? null : parseInt(element.unit_value ?? 0),
                                created_on: new Date(),
                                created_by: formData.createByUserId
                            }
                            var responseUnitsItem = await dynamicDataInsertService("inventory_units_info", "product_unit_info_id", null, true, columnsUnitSubTypesRollItem);


                        }

                    }

                    //--insert into ledger quantity
                    const columnsLedger: any = {
                        productid: insertedProductId,
                        foreign_key_table_name: 'products',
                        foreign_key_name: 'productid',
                        foreign_key_value: insertedProductId,
                        quantity: formData.stockquantity || 0,
                        weight_quantity_value: formData.weight_value || 0,
                        action_type: ProductionEntriesTypesEnum.NewProductEntry,

                        created_at: new Date(),
                    };

                    const responseLedger = await dynamicDataInsertService('inventory_ledger', 'ledger_id', null, true, columnsLedger);
                }

            }


        } catch (error) {
            console.error('Error executing insert/update proudct details:', error);
            throw error;
        }

        return response;
    }


    public async getAllProductsService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
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
                MTBL.*, u.*
                FROM products MTBL
                JOIN units u
                on u.unit_id = MTBL.weight_unit_id
                WHERE MTBL.productid IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.productid DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
            `);

            if (results && results.length > 0) {
                //--get inventory_units_info      
                for (const element of results) {
                    var inventoryUnitsInfo = await dynamicDataGetByAnyColumnService('inventory_units_info', 'productid', element.productid);
                    element.inventory_units_info = inventoryUnitsInfo?.data;
                }
            }

            const finalData: any = results;
            return finalData;

        });



    }

    public async getProductsListBySearchTermService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {

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
                FROM products MTBL
                WHERE MTBL.productid IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.productid DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
            `);

            const finalData: any = results;
            return finalData;
        });


    }

    public async getProductDetailByIdApi(productid: number): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            const [results]: any = await connection.query(`
                SELECT MTBL.*, u.unit_short_name
                FROM products MTBL
                JOIN units u on u.unit_id = MTBL.weight_unit_id
                WHERE MTBL.productid  = ${productid};`);

            if (results) {
                const finalData: any = results[0];
                if (finalData) {
                    //-- Get latest order item for a sepecific product
                    const [resultLatestProductPurchaseOrder]: any = await connection.query(`
                        SELECT MTBL.*
                        FROM purchase_orders_items MTBL
                        WHERE MTBL.product_id  = ${productid}
                        ORDER BY MTBL.line_item_id DESC
                        LIMIT 1; `);
                    if (resultLatestProductPurchaseOrder) {
                        finalData.product_latest_purchase_order_item = resultLatestProductPurchaseOrder[0];
                    } else {
                        finalData.product_latest_purchase_order_item = null
                    }

                    const [resultProductUnitInfo]: any = await connection.query(`
                        select mtbl.product_unit_info_id, mtbl.productid, mtbl.unit_type, mtbl.unit_sub_type, mtbl.unit_id ,  mtbl.unit_value ,
                        unt.unit_short_name  
                        From inventory_units_info mtbl
                        left join units unt on unt.unit_id = mtbl.unit_id
                        WHERE mtbl.productid  = ${productid} ;
                        `);

                    if (resultProductUnitInfo) {
                        finalData.product_units_info = resultProductUnitInfo;
                    } else {
                        finalData.product_units_info = null
                    }



                }
                return finalData;
            } else {
                const finalData: any = {};
                return finalData;
            }

        });

    }


    public async getTaxRulesService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
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


        });


    }

    public async getUnitsListService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as totalRecords, mtbl.*
                FROM units mtbl
                WHERE mtbl.unit_id IS NOT NULL
                ORDER BY mtbl.unit_id ASC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
            `);

            const userData: any = results;
            return userData;

        });


    }

}

export default InventoryService;
