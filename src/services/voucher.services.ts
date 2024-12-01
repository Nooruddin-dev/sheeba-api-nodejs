
import { Pool } from 'mysql2/promise';
import { connectionPool, withConnectionDatabase } from '../configurations/db';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { IGrnVoucherCreateRequestForm } from '../models/voucher/IGrnVoucherCreateRequestForm';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { dynamicDataGetByAnyColumnService, dynamicDataGetService, dynamicDataInsertService, dynamicDataUpdateService } from './dynamic.service';
import OrdersService from './orders.service';
import { ProductionEntriesTypesEnum, PurchaseOrderStatusTypesEnum, UnitTypesEnum } from '../models/enum/GlobalEnums';
import { getProductQuantityFromLedger, getProductWeightValueFromLedger } from './common.service';

class VoucherServices {



    public async getPurchaseOrderDetailsForGrnVoucherApi(purchase_order_id: number): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {

            const [results]: any = await connection.query(`
                SELECT MTBL.*
                FROM purchase_orders MTBL
                WHERE MTBL.purchase_order_id  = ${purchase_order_id} LIMIT 1;`);

            if (results && results.length > 0) {
                const finalData: any = results[0];

                //--get purchase_orders_items
                const [results_items]: any = await connection.query(`
                    SELECT MTBL.*, prd.product_name, prd.remaining_quantity, prd.remaining_weight
                    FROM purchase_orders_items MTBL
                    INNER JOIN products prd on prd.productid = MTBL.product_id
                    WHERE MTBL.purchase_order_id  = ${purchase_order_id} LIMIT 50;`);


                finalData.purchase_orders_items = results_items ?? [];

                const [results_order_taxes]: any = await connection.query(`
                    SELECT MTBL.*
                    FROM order_taxes MTBL
                    WHERE MTBL.purchase_order_id  = ${purchase_order_id} LIMIT 50;`);


                finalData.order_taxes = results_order_taxes ?? [];

                return finalData;
            } else {
                const finalData: any = {};
                return finalData;
            }

        });


    }

    public async gerPurchaseOrdersListForGrnVoucherBySearchTermService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {

            const searchQueryOrder = FormData?.searchQueryOrder;
            let searchParameters = '';



            if (stringIsNullOrWhiteSpace(searchQueryOrder) == false) {
                searchParameters += ` AND ( MTBL.purchase_order_id LIKE '%${searchQueryOrder}%' OR
                     MTBL.po_number LIKE '%${searchQueryOrder}%' OR
                     MTBL.po_reference LIKE '%${searchQueryOrder}%' )`;
            }



            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*
                FROM purchase_orders MTBL
                LEFT JOIN (
                  SELECT DISTINCT purchase_order_id, status_id
                  FROM purchase_order_status_mapping
                  WHERE status_id  = 4 AND is_active = 1
                ) ExcludeOrders ON MTBL.purchase_order_id = ExcludeOrders.purchase_order_id
                WHERE ExcludeOrders.status_id = 4 
                ${searchParameters}
                ORDER BY MTBL.purchase_order_id DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
            `);

            const finalData: any = results;

            return finalData;

        });


    }


    public async getGrnVoucherTaxesByVoucherId(voucherId: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            const [results]: any = await connection.query(`
                SELECT MTBL.*
                FROM grn_voucher_taxes MTBL
                WHERE MTBL.voucher_id  = '${voucherId}';`);

            if (results) {
                const finalData: any = results;
                return finalData;
            } else {
                const finalData: any = [];
                return finalData;
            }

        });


    }



    public async createGrnVoucherService(formData: IGrnVoucherCreateRequestForm): Promise<ServiceResponseInterface> {
        let responseGrnVoucherInsert: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        try {
            //--Insert into grn_voucher table
            const columnsGrnVoucher: any = {
                voucher_number: '', //--formatted auto number like : 'GR000001'
                po_number: formData.po_number,
                purchase_order_id: formData.purchase_order_id,
                receiver_name: formData.receiver_name,
                receiver_contact: formData.receiver_contact,
                grn_date: formData.grn_date,
                show_company_detail: formData.show_company_detail,
                subtotal: formData.subtotal,
                total: formData.total,
                created_on: new Date(),
                created_by: formData.created_by_user_id,
            };

            responseGrnVoucherInsert = await dynamicDataInsertService("grn_voucher", "voucher_id", null, true, columnsGrnVoucher);
            if (responseGrnVoucherInsert && responseGrnVoucherInsert.success == true && responseGrnVoucherInsert.primaryKeyValue) {

                const voucher_id = responseGrnVoucherInsert.primaryKeyValue;
                //--insert into grn_voucher_line_items
                let grnVoucherLineItems = {
                    tableName: 'grn_voucher_line_items',
                    primaryKeyName: 'grn_line_item_id',
                    primaryKeyValue: null,
                    isAutoIncremented: true
                }

                if (formData.products && formData.products.length > 0) {
                    for (const element of formData.products) {
                        //--get product details by id
                        var productDetail = await dynamicDataGetService('products', 'productid', element.product_id);
                        if (productDetail && productDetail?.data && productDetail?.data?.productid > 0) {
                            const columnGrnVoucherLineItem: any = {
                                voucher_id: voucher_id,
                                product_id: element.product_id,
                                order_line_item_id: element.order_line_item_id,
                                product_name: productDetail?.data?.product_name,
                                product_sku_code: element.product_sku_code,
                                quantity: element.quantity,
                                weight: element.weight,
                                cost: element.cost,
                                cost_inclusive: element.cost_inclusive,
                                total: element.total,
                            }
                            await dynamicDataInsertService(grnVoucherLineItems.tableName, grnVoucherLineItems.primaryKeyName,
                                grnVoucherLineItems.primaryKeyValue, grnVoucherLineItems.isAutoIncremented, columnGrnVoucherLineItem);


                            let reel_quanity = 0;
                            if (productDetail?.data?.unit_type == UnitTypesEnum.Roll) {
                                reel_quanity = parseInt(productDetail.data.reel_quanity ?? '0') + parseInt(element.quantity?.toString() ?? '0');
                            }

                            //--update item inventory by reducing the quanity of product here
                            const columnsLedger: any = {
                                productid: element.product_id,
                                foreign_key_table_name: 'grn_voucher',
                                foreign_key_name: 'voucher_id',
                                foreign_key_value: voucher_id,
                                quantity: parseFloat(element.quantity?.toString() ?? '0'),
                                weight_quantity_value: parseFloat(element.weight?.toString() ?? '0'),
                                action_type: ProductionEntriesTypesEnum.NewGRN,
                                created_at: new Date(),
                            };
                            const responseLedger = await dynamicDataInsertService('inventory_ledger', 'ledger_id', null, true, columnsLedger);
                            if (responseLedger?.success == true) {
                                //-- update product stock quantity
                                const ledgerStockQuantity = await getProductQuantityFromLedger(element.product_id);
                                const ledgerWeightResult = await getProductWeightValueFromLedger(element.product_id);
                                const newRemainingQuantity = (productDetail?.data.remaining_quantity ?? 0) - element.quantity;
                                const newRemainingWeight = (productDetail?.data.remaining_weight ?? 0) - element.weight;
                                const columnsProducts: any = {
                                    remaining_weight: newRemainingWeight,
                                    weight_value: ledgerWeightResult.total_weight_quantity,
                                    updated_on: new Date(),
                                    updated_by: formData.created_by_user_id,
                                    stockquantity: ledgerStockQuantity.total_quantity,
                                    remaining_quantity: newRemainingQuantity,
                                };
                                await dynamicDataUpdateService('products', 'productid', element.product_id, columnsProducts);

                            }

                            //-- get purchase order line item by id
                            var purchaseOrderLineItemDetail = await dynamicDataGetService('purchase_orders_items', 'line_item_id', element.order_line_item_id);
                            if (purchaseOrderLineItemDetail) {
                                //--update receiving_grn_quantity in purchase_orders_items when ever grn created.
                                const columnsPurchaseOrderItem: any = {
                                    receiving_grn_quantity: parseFloat(purchaseOrderLineItemDetail?.data?.receiving_grn_quantity || '0') + element.quantity,
                                };
                                await dynamicDataUpdateService('purchase_orders_items', 'line_item_id', element.order_line_item_id, columnsPurchaseOrderItem);

                            }

                        }

                    }

                }

                //--update GRN Voucher 'voucher_number
                const voucher_number = 'GR' + voucher_id?.toString().padStart(7, '0');
                const columnsOrderUpdate: any = {
                    voucher_number: voucher_number,
                    updated_on: new Date(),
                    updated_by: formData.created_by_user_id,

                };
                await dynamicDataUpdateService('grn_voucher', 'voucher_id', voucher_id, columnsOrderUpdate);
            }


        } catch (error) {
            console.error('error while creating grn:', error);
            throw error;
        }

        return responseGrnVoucherInsert;
    }


    public async getGrnVouchersListService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let searchParameters = '';


            if (stringIsNullOrWhiteSpace(FormData.voucher_number) == false) {
                searchParameters += ` AND MTBL.voucher_number = '${FormData.voucher_number}' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.po_number) == false) {
                searchParameters += ` AND MTBL.po_number LIKE '%${FormData.po_number}%' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.receiver_name) == false) {
                searchParameters += ` AND MTBL.receiver_name LIKE '%${FormData.receiver_name}%' `;
            }

            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, MTBL.*
                FROM grn_voucher MTBL
                WHERE MTBL.voucher_id IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.voucher_id DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
            `);

            const finalData: any = results;
            return finalData;

        });


    }

    public async getGrnVoucherDetailByIdService(voucher_id: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let grnVoucherMain: any = {};


            const [resultsGrnVoucherMain]: any = await connection.query(`
                SELECT 
                MTBL.*
                FROM grn_voucher MTBL
                WHERE MTBL.voucher_id = ${voucher_id} `);


            if (resultsGrnVoucherMain && resultsGrnVoucherMain.length > 0) {
                grnVoucherMain = resultsGrnVoucherMain[0];

                const [resultsGrnVoucherItem]: any = await connection.query(`
                    SELECT 
                    MTBL.*, prd.product_name as product_name
                    FROM grn_voucher_line_items MTBL
                    inner join products prd on prd.productid =  MTBL.product_id
                    WHERE MTBL.voucher_id = ${voucher_id} `);

                const grnVoucherItems: any = resultsGrnVoucherItem;
                grnVoucherMain.grn_voucher_line_items = grnVoucherItems;
                if (grnVoucherMain.grn_voucher_line_items && grnVoucherMain.grn_voucher_line_items.length > 0) {
                    for (const element of grnVoucherMain.grn_voucher_line_items) {

                        const [resultUnitInfo]: any = await connection.query(`
                            select MTBL.*, UNT.unit_short_name
                            from inventory_units_info MTBL
                            left join units UNT on UNT.unit_id = MTBL.unit_id
                            WHERE MTBL.productid = ${element.product_id} `);
                        
                        const resultUnitInfoArray: any = resultUnitInfo;
                        element.inventory_units_info = resultUnitInfoArray;

                    }
                }
            }

            return grnVoucherMain;

        });


    }



}

export default VoucherServices;