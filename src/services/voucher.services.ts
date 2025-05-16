
import { Pool } from 'mysql2/promise';
import { connectionPool, withConnectionDatabase } from '../configurations/db';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { IGrnVoucherCreateRequestForm } from '../models/voucher/IGrnVoucherCreateRequestForm';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { dynamicDataGetByAnyColumnService, dynamicDataGetService, dynamicDataGetServiceWithConnection, dynamicDataInsertService, dynamicDataInsertServiceNew, dynamicDataUpdateService, dynamicDataUpdateServiceWithConnection } from './dynamic.service';
import OrdersService from './orders.service';
import { GrnVoucherStatus, ProductionEntriesTypesEnum, PurchaseOrderStatusTypesEnum, UnitTypesEnum } from '../models/enum/GlobalEnums';
import { getProductQuantityFromLedger, getProductWeightValueFromLedger, getWeightAndQtyFromLedger } from './common.service';
import { BusinessError } from '../configurations/error';
import { DynamicCud } from './dynamic-crud.service';
import InventoryService from './inventory.service';

class VoucherServices {

    private readonly inventoryService: InventoryService;

    constructor() {
        this.inventoryService = new InventoryService();
    }

    public async getByFilter(filter: any): Promise<any> {
        return withConnectionDatabase(async (connection) => {
            try {
                const whereClauses: string[] = [];
                const params: any[] = [];

                if (filter.voucherNumber) {
                    whereClauses.push('gv.voucher_number LIKE ?');
                    params.push(`${filter.voucherNumber}%`);
                }

                if (filter.poNumber) {
                    whereClauses.push('gv.po_number LIKE ?');
                    params.push(`${filter.poNumber}%`);
                }

                if (filter.receiver_name) {
                    whereClauses.push('gv.receiver_name LIKE ?');
                    params.push(`${filter.receiver_name}%`);
                }

                params.push(parseInt(filter?.page, 10) ?? 0);
                params.push(parseInt(filter?.pageSize, 10) ?? 25);

                const dataQuery = `
                    SELECT 
                        gv.voucher_id as voucherId,
                        gv.voucher_number as voucherNumber,
                        gv.po_number as poNumber,
                        gv.receiver_name as receiverName,
                        gv.receiver_contact as receiverContact,
                        gv.grn_date as grnDate,
                        gv.total as total,
                        gv.created_on as createdOn,
                        gv.status as status
                    FROM
                        grn_voucher gv
                    ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}
                    ORDER BY gv.created_on DESC
                    LIMIT ?, ?;
                `;

                console.log('dataQuery:', dataQuery);
                console.log('params:', params);
                const [dataResult]: any = await connection.query(dataQuery, params);

                const countQuery = `
                    SELECT 
                        COUNT(gv.voucher_id) as total
                    FROM
                        grn_voucher gv
                    ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}
                `;
                const [countResult]: any = await connection.query(countQuery, params);

                return { totalRecords: countResult[0].total, data: dataResult };
            } finally {
                connection.release();
            }
        });
    }

    public async cancelGrn(param: any): Promise<void> {
        if (!param?.id) {
            throw new BusinessError(400, 'GRN ID is required');
        }

        await withConnectionDatabase(async (connection) => {
            try {
                connection.beginTransaction();

                const [gvRows]: any[] = await connection.query(`
                        SELECT
                            gv.status
                        FROM
                            grn_voucher gv
                        WHERE
                            gv.voucher_id = ?
                    `, [param.id]);
                if (gvRows?.[0]?.status === GrnVoucherStatus.Cancelled) {
                    throw new BusinessError(400, 'GRN is already cancelled');
                }

                const [gvliRows]: any[] = await connection.query(`
                        SELECT
                            gvli.product_id,
                            gvli.quantity,
                            gvli.weight
                        FROM
                            grn_voucher_line_items gvli
                        WHERE
                            gvli.voucher_id = ?
                    `, [param.id]);

                for (const row of gvliRows) {
                    await this.inventoryService.updateInventory({
                        productId: row.product_id,
                        quantity: parseFloat(row.quantity) * -1,
                        weight: parseFloat(row.weight) * -1,
                        actionType: ProductionEntriesTypesEnum.CancelGRN,
                        contextId: param.id,
                    }, connection);
                    const [productRow]: any[] = await connection.query(`
                        SELECT
                            remaining_quantity,
                            remaining_weight
                        FROM
                            products
                        WHERE
                            productid = ?
                    `, [row.product_id]);

                    const remainingQuantity = parseFloat(productRow[0].remaining_quantity) + parseFloat(row.quantity);
                    const remainingWeight = parseFloat(productRow[0].remaining_weight) + parseFloat(row.weight);
                    await DynamicCud.update('products', row.product_id, 'productid', {
                        remaining_quantity: remainingQuantity,
                        remaining_weight: remainingWeight,
                    }, connection);
                }

                await DynamicCud.update('grn_voucher', param.id, 'voucher_id', { status: GrnVoucherStatus.Cancelled }, connection);
                
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        });
    }

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




            const offset = (FormData.pageNo - 1) * FormData.pageSize;
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
                LIMIT ${FormData.pageSize} OFFSET ${offset}
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

        const connection = await connectionPool.getConnection();

        try {

            // Begin the transaction
            await connection.beginTransaction();

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

            responseGrnVoucherInsert = await dynamicDataInsertServiceNew("grn_voucher", "voucher_id", null, true, columnsGrnVoucher, connection);
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
                        var productDetail = await dynamicDataGetServiceWithConnection('products', 'productid', element.product_id, connection);
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
                            await dynamicDataInsertServiceNew(grnVoucherLineItems.tableName, grnVoucherLineItems.primaryKeyName,
                                grnVoucherLineItems.primaryKeyValue, grnVoucherLineItems.isAutoIncremented, columnGrnVoucherLineItem, connection);


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
                            const responseLedger = await dynamicDataInsertServiceNew('inventory_ledger', 'ledger_id', null, true, columnsLedger, connection);
                            if (responseLedger?.success == true) {
                                //-- update product stock quantity
                                const ledger = await getWeightAndQtyFromLedger(element.product_id, connection);
                                const newRemainingQuantity = (productDetail?.data.remaining_quantity ?? 0) - element.quantity;
                                const newRemainingWeight = (productDetail?.data.remaining_weight ?? 0) - element.weight;
                                const columnsProducts: any = {
                                    remaining_weight: newRemainingWeight,
                                    weight_value: ledger.total_weight_quantity,
                                    updated_on: new Date(),
                                    updated_by: formData.created_by_user_id,
                                    stockquantity: ledger.total_quantity,
                                    remaining_quantity: newRemainingQuantity,
                                };
                                await dynamicDataUpdateServiceWithConnection('products', 'productid', element.product_id, columnsProducts, connection);

                            }

                            //-- get purchase order line item by id
                            var purchaseOrderLineItemDetail = await dynamicDataGetServiceWithConnection('purchase_orders_items', 'line_item_id', element.order_line_item_id, connection);
                            if (purchaseOrderLineItemDetail) {
                                //--update receiving_grn_quantity in purchase_orders_items when ever grn created.
                                const columnsPurchaseOrderItem: any = {
                                    receiving_grn_quantity: parseFloat(purchaseOrderLineItemDetail?.data?.receiving_grn_quantity || '0') + element.quantity,
                                };
                                await dynamicDataUpdateServiceWithConnection('purchase_orders_items', 'line_item_id', element.order_line_item_id, columnsPurchaseOrderItem, connection);

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
                await dynamicDataUpdateServiceWithConnection('grn_voucher', 'voucher_id', voucher_id, columnsOrderUpdate, connection);
            }

            //--Commit the transaction if all inserts/updates are successful
            await connection.commit();


        } catch (error) {
            console.error('error while creating grn:', error);

            //--Rollback the transaction on error
            await connection.rollback();

            throw error;
        } finally {
            if (connection) {
                if (typeof connection.release === 'function') {
                    await connection.release();
                } else if (typeof connection.end === 'function') {
                    await connection.end();
                }

            }
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


            const offset = (FormData.pageNo - 1) * FormData.pageSize;
            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, MTBL.*
                FROM grn_voucher MTBL
                WHERE MTBL.voucher_id IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.voucher_id DESC
                LIMIT ${FormData.pageSize} OFFSET ${offset}
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