import { Pool } from 'mysql2/promise';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { dynamicDataGetService, dynamicDataGetServiceWithConnection, dynamicDataInsertService, dynamicDataInsertServiceNew, dynamicDataUpdateService, dynamicDataUpdateServiceWithConnection } from './dynamic.service';
import InventoryService from './inventory.service';
import { IPurchaseOrderRequestForm } from '../models/orders/IPurchaseOrderRequestForm';
import { connectionPool, withConnectionDatabase } from '../configurations/db';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { GrnVoucherStatus, PurchaseOrderStatusTypesEnum } from '../models/enum/GlobalEnums';
import { IPurchaseOrderStatusUpdateRequestForm } from '../models/orders/IPurchaseOrderStatusUpdateRequestForm';
import { sendEmailFunc } from './EmailService';
import { ROOT_EMAIL, WEB_APP_URL } from '../configurations/config';
import { v4 as uuidv4 } from 'uuid';
import { BusinessError } from '../configurations/error';


class OrdersService {

    private inventoryService: InventoryService;

    constructor() {
        this.inventoryService = new InventoryService();
    }

    public async getGrnReport(filter: any): Promise<any> {
        if (!filter?.startDate) {
            throw new BusinessError(400, 'Start date is required');
        }

        if (!filter?.endDate) {
            throw new BusinessError(400, 'End date is required');
        }

        const whereClauses: string[] = [];
        const params: any[] = [];
        if (filter?.sku) {
            whereClauses.push('gvli.product_sku_code = ?');
            params.push(filter.sku);
        }

        const entries = await withConnectionDatabase(async (connection) => {
            try {
                const [result]: any = await connection.query(`
                        SELECT
                            gv.voucher_id as id,
                            gv.voucher_number as grnNumber,
                            gv.grn_date as grnDate,
                            gv.po_number as poNumber,
                            po.company_name as companyName,
                            gvli.product_id as productId,
                            gvli.product_sku_code as productSku,
                            gvli.product_name as productName,
                            gvli.quantity,
                            gvli.weight
                        FROM
                            grn_voucher gv
                        JOIN 
                            grn_voucher_line_items gvli
                            ON gvli.voucher_id = gv.voucher_id
                        JOIN 
                            purchase_orders po
                            ON po.purchase_order_id = gv.purchase_order_id
                        WHERE 
                            gv.status = ?
                            AND gv.grn_date BETWEEN ? AND ?
                            ${whereClauses.length ? 'AND ' + whereClauses.join(' AND ') : ''}
                        ORDER BY
                            gv.grn_date DESC
                    `, [GrnVoucherStatus.Issued, filter.startDate, filter.endDate, ...params]);

                return result;
            } finally {
                connection.release();
            }
        });

        return entries;
    }


    public async getPurchaseOrderTaxesByOrderId(orderId: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            const [results]: any = await connection.query(`
                SELECT MTBL.*
                FROM order_taxes MTBL
                WHERE MTBL.purchase_order_id  = '${orderId}';`);

            if (results) {
                const finalData: any = results;
                return finalData;
            } else {
                const finalData: any = [];
                return finalData;
            }

        });


    }


    public async getPurchaseOrderLatestStatusService(orderId: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {

            const [results]: any = await connection.query(`
              SELECT ost.status_id, ost.purchase_order_id, OSTYPE.status_name
               FROM purchase_order_status_mapping ost
               LEFT JOIN purchase_order_status_types OSTYPE ON ost.status_id = OSTYPE.status_id
               WHERE ost.is_active = 1 AND ost.purchase_order_id = ${orderId}
               ORDER BY ost.order_status_mapping_id DESC
               LIMIT 1;`);

            if (results) {
                const finalData: any = results[0];
                return finalData;
            } else {
                const finalData: any = [];
                return finalData;
            }

        });


    }

    public async createPurchaseOrderServiceNew(formData: IPurchaseOrderRequestForm): Promise<ServiceResponseInterface> {
        let responseOrderInsert: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        const connection = await connectionPool.getConnection();

        try {
            // Begin the transaction
            await connection.beginTransaction();

            //--Insert into purchase order table
            let purchaseOrderTableMainData = {
                tableName: 'purchase_orders',
                primaryKeyName: 'purchase_order_id',
                primaryKeyValue: null,
                isAutoIncremented: true
            }

            const columnsPurchaseOrder: any = {
                po_number: '', //--formated auto number like : '0000001'
                po_reference: formData.po_reference,
                delivery_date: formData.delivery_date,
                company_name: formData.company_name,
                order_date: formData.order_date,
                vendor_id: formData.vendor_id,
                sale_representative_id: formData.sale_representative_id,
                purchaser_name: formData.purchaser_name,
                payment_terms: formData.payment_terms,
                remarks: formData.remarks,
                show_company_detail: formData.show_company_detail,
                order_subtotal: formData.order_subtotal,
                order_total: formData.order_total,
                order_tax_percentage: formData.order_tax_percentage,
                order_tax_amount: formData.order_tax_amount,
                order_discount: formData.order_discount,
                order_total_discount: formData.order_total_discount,
                order_total_tax: formData.order_total_tax,
                order_guid: uuidv4(),
                created_on: new Date(),
                created_by: formData.created_by_user_id,
            };

            responseOrderInsert = await dynamicDataInsertServiceNew(purchaseOrderTableMainData.tableName, purchaseOrderTableMainData.primaryKeyName, purchaseOrderTableMainData.primaryKeyValue,
                purchaseOrderTableMainData.isAutoIncremented, columnsPurchaseOrder, connection);
            if (responseOrderInsert && responseOrderInsert.success == true && responseOrderInsert.primaryKeyValue) {
                const order_id = responseOrderInsert.primaryKeyValue;

                //--insert into purchase order items
                let purchaseOrderItemsTableMainData = {
                    tableName: 'purchase_orders_items',
                    primaryKeyName: 'line_item_id',
                    primaryKeyValue: null,
                    isAutoIncremented: true
                }

                if (formData.products && formData.products.length > 0) {
                    for (const product of formData.products) {
                        //--get product details by id
                        var productDetail = await dynamicDataGetServiceWithConnection('products', 'productid', product.product_id, connection);
                        if (productDetail && productDetail?.data && productDetail?.data?.productid > 0) {
                            let po_rate: number = product.price;
                            const columnsPurchaseOrderItem: any = {
                                purchase_order_id: order_id,
                                item_name: productDetail?.data?.product_name,
                                product_id: product.product_id,
                                code_sku: productDetail?.data?.sku,
                                weight: product.weight,
                                po_rate: product.price,
                                item_units_info_json: product.product_units_info && product.product_units_info.length > 0 ? JSON.stringify(product.product_units_info) : null,
                                tax_1_percentage: product.tax_1_percentage,
                                tax_1_amount: product.tax_1_percentage,
                                tax_2_percentage: product.tax_2_percentage,
                                tax_2_amount: product.tax_2_amount,
                                tax_3_percentage: product.tax_3_percentage,
                                tax_3_amount: product.tax_3_amount,
                                discount: product.discount,
                                subtotal: product.subtotal,
                                total_tax: product.total_tax,
                                total: product.total
                            }
                            var responseOrderItem = await dynamicDataInsertServiceNew(purchaseOrderItemsTableMainData.tableName, purchaseOrderItemsTableMainData.primaryKeyName,
                                purchaseOrderItemsTableMainData.primaryKeyValue, purchaseOrderItemsTableMainData.isAutoIncremented, columnsPurchaseOrderItem, connection);
                            const prodColUpdate = { remaining_weight: parseFloat(productDetail.data?.remaining_weight ?? 0) + parseFloat(product.weight?.toString() ?? 0) };
                            await dynamicDataUpdateServiceWithConnection('products', 'productid', product.product_id, prodColUpdate, connection);
                        }
                    }
                }

                //--update purchase order 'po_number
                const poNumber = 'PO' + order_id?.toString().padStart(7, '0');
                const columnsOrderUpdate: any = {
                    po_number: poNumber,
                    updated_on: new Date(),
                    updated_by: formData.created_by_user_id,

                };
                await dynamicDataUpdateServiceWithConnection('purchase_orders', 'purchase_order_id', order_id, columnsOrderUpdate, connection);


                //--insert into order status mapping table "purchase_order_status_mapping"
                const columnsOrderStatusMappings: any = {
                    purchase_order_id: order_id,
                    status_id: PurchaseOrderStatusTypesEnum.Pending,
                    is_active: 1,
                    created_on: new Date(),
                    created_by: formData.created_by_user_id,
                };
                await dynamicDataInsertServiceNew('purchase_order_status_mapping', 'order_status_mapping_id',
                    null, true, columnsOrderStatusMappings, connection);


                //Send email
                const purchaseOrdersLink = `${WEB_APP_URL}/site/purchase-orders-list`
                const subject = 'New Purchase Order Created';
                const html = `
                        <b>A new purchase order has been created.</b><br>
                        <p>Order ID: ${poNumber}</p>
                        <a href="${purchaseOrdersLink}">View Purchase Orders</a>
                    `;
                sendEmailFunc(ROOT_EMAIL, subject, html);
            }

            //--Commit the transaction if all inserts/updates are successful
            await connection.commit();

        } catch (error) {
            console.error('Transaction error:', error);

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

        return responseOrderInsert;
    }



    public async getAllPurchaseOrdersListService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let searchParameters = '';


            if (FormData.purchase_order_id > 0) {
                searchParameters += ` AND MTBL.purchase_order_id = ${FormData.purchase_order_id}`;
            }

            if (stringIsNullOrWhiteSpace(FormData.po_number) == false) {
                searchParameters += ` AND MTBL.po_number = '${FormData.po_number}' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.company_name) == false) {
                searchParameters += ` AND MTBL.company_name LIKE '%${FormData.company_name}%' `;
            }



            const offset = (FormData.pageNo - 1) * FormData.pageSize;
            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*,  
                vendor.FirstName as vendor_first_name, vendor.LastName as vendor_last_name,
                sale_repres_user.FirstName as sale_representative_first_name, sale_repres_user.LastName as sale_representative_last_name,
                 (SELECT COUNT(*) FROM grn_voucher gv WHERE gv.purchase_order_id = MTBL.purchase_order_id) as total_grn_vouchers
                FROM purchase_orders MTBL
                inner join busnpartner vendor on vendor.BusnPartnerId = MTBL.vendor_id
                inner join busnpartner sale_repres_user on sale_repres_user.BusnPartnerId = MTBL.sale_representative_id

                WHERE MTBL.purchase_order_id IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.purchase_order_id DESC
                LIMIT ${FormData.pageSize} OFFSET ${offset}
            `);

            const finalData: any = results;

            //--get purchase order status mapping
            if (finalData && finalData?.length > 0) {
                for (var element of finalData) {
                    //--get purchase order latest status info
                    const purchaseOrderLatestStatus = await this.getPurchaseOrderLatestStatusService(element.purchase_order_id);
                    if (purchaseOrderLatestStatus) {
                        element.status_id = purchaseOrderLatestStatus?.status_id;
                        element.status_name = purchaseOrderLatestStatus?.status_name;
                    }
                }
            }

            return finalData;

        });


    }

    public async getPurchaseOrderDetailById(purchase_order_id: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let orderMain: any = {};


            const [resultsOrderMain]: any = await connection.query(`
                SELECT 
                MTBL.*, 
                vendor.FirstName as vendor_first_name, vendor.LastName as vendor_last_name,
                sale_repres_user.FirstName as sale_representative_first_name, sale_repres_user.LastName as sale_representative_last_name
                FROM purchase_orders MTBL
                inner join busnpartner vendor on vendor.BusnPartnerId = MTBL.vendor_id
                inner join busnpartner sale_repres_user on sale_repres_user.BusnPartnerId = MTBL.sale_representative_id
                WHERE MTBL.purchase_order_id = ${purchase_order_id} `);


            if (resultsOrderMain && resultsOrderMain.length > 0) {
                orderMain = resultsOrderMain[0];


                //--get purchase order latest status info
                const purchaseOrderLatestStatus = await this.getPurchaseOrderLatestStatusService(orderMain.purchase_order_id);
                if (purchaseOrderLatestStatus) {
                    orderMain.status_id = purchaseOrderLatestStatus?.status_id;
                    orderMain.status_name = purchaseOrderLatestStatus?.status_name;
                }

                //--get purchase order items
                const [resultsOrderItem]: any = await connection.query(`
                    SELECT 
                    MTBL.*, prd.product_name as product_name, prd.sku
                    FROM purchase_orders_items MTBL
                    inner join products prd on prd.productid =  MTBL.product_id
                    WHERE MTBL.purchase_order_id = ${orderMain.purchase_order_id} `);

                const orderItem: any = resultsOrderItem;
                orderMain.order_items = orderItem;

                if (orderMain.order_items && orderMain.order_items.length > 0) {
                    for (const element of orderMain.order_items) {

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

            return orderMain;

        });


    }

    public async getPurchaseOrderDetailForEditCloneByIdService(purchase_order_id: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let orderMain: any = {};


            const [resultsOrderMain]: any = await connection.query(`
                SELECT 
                MTBL.*,
                vendor.FirstName as vendor_first_name, vendor.LastName as vendor_last_name,
                sale_repres_user.FirstName as sale_representative_first_name, sale_repres_user.LastName as sale_representative_last_name
                FROM purchase_orders MTBL
                inner join busnpartner vendor on vendor.BusnPartnerId = MTBL.vendor_id
                inner join busnpartner sale_repres_user on sale_repres_user.BusnPartnerId = MTBL.sale_representative_id
                WHERE MTBL.purchase_order_id = ${purchase_order_id} `);


            if (resultsOrderMain && resultsOrderMain.length > 0) {
                orderMain = resultsOrderMain[0];

                //-- Get order items
                const [resultsOrderItem]: any = await connection.query(`
                    SELECT 
                    MTBL.*, prd.product_name as product_name, prd.sku, prd.price , prd.stockquantity
                    FROM purchase_orders_items MTBL
                    inner join products prd on prd.productid =  MTBL.product_id
                    WHERE MTBL.purchase_order_id = ${orderMain.purchase_order_id} `);
                const orderItem: any = resultsOrderItem;
                orderMain.order_items = orderItem;

                //--  Get order taxes info
                const [resultsOrderTaxes]: any = await connection.query(`
                    SELECT 
                    MTBL.*
                    FROM order_taxes MTBL
                    WHERE MTBL.purchase_order_id = ${orderMain.purchase_order_id} `);
                const orderTaxes: any = resultsOrderTaxes;
                orderMain.order_taxes = orderTaxes;

            }

            return orderMain;

        });


    }

    public async updatePurchaseOrderStatusService(formData: IPurchaseOrderStatusUpdateRequestForm): Promise<ServiceResponseInterface> {

        let response: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        try {

            //--First update existing order status mapping
            var responePurchaseOrderUpdate = await withConnectionDatabase(async (connection: any) => {
                let response: ServiceResponseInterface = {
                    success: false,
                    responseMessage: '',
                    primaryKeyValue: null
                };


                // Execute the update query
                const [result]: any = await connection.execute(`UPDATE purchase_order_status_mapping
                      SET is_active = 0 where purchase_order_id = ${formData.purchase_order_id};`);

                if (result.affectedRows > 0) {
                    response.success = true;
                    response.primaryKeyValue = formData.purchase_order_id;
                    response.responseMessage = 'Updated Successfully!';



                } else {
                    response.responseMessage = 'No rows were updated!';
                }

                // --now insert new row for order status mapping
                const columnsOrderStatusMapping: any = {
                    purchase_order_id: formData.purchase_order_id,
                    status_id: formData.status_id,
                    is_active: 1,
                    created_on: new Date(),
                    created_by: formData.createByUserId,
                };
                response = await dynamicDataInsertService("purchase_order_status_mapping", "order_status_mapping_id", null, true, columnsOrderStatusMapping);
                const purchaseOrderDetail = await dynamicDataGetService("purchase_orders", "purchase_order_id", formData.purchase_order_id);

                //--now send email to vendor on status approval
                if (formData.status_id == PurchaseOrderStatusTypesEnum.Approve) {

                    const promises: any[] = [];
                    const [result, _] = await connection.query('select product_id, weight from purchase_orders_items poi where poi.purchase_order_id = ?', formData.purchase_order_id);
                    result.forEach((item: any) => {
                        promises.push(connection.query('update products p set remaining_weight = p.remaining_weight + ? where p.productid = ?', [parseFloat(item.weight || 0), item.product_id]));
                    });
                    await Promise.all(promises);

                    // Send email
                    const orderVendorId = purchaseOrderDetail?.data?.vendor_id;
                    const vendorDetail = await dynamicDataGetService("busnpartner", "BusnPartnerId", orderVendorId);
                    const purchaseOrdersLink = `${WEB_APP_URL}/site/vendor/purchase-order-details/${formData.purchase_order_id}`;
                    const subject = 'Purchase order has been approved';
                    const html = `
                            <p>The status of your purchase order <b>${purchaseOrderDetail?.data.po_number}</b> has been approved.</p><br>
                            <a href="${purchaseOrdersLink}">View Purchase Order</a>
                        `;
                    sendEmailFunc(vendorDetail?.data?.EmailAddress, subject, html);
                }

                if (formData.status_id == PurchaseOrderStatusTypesEnum.Cancel) {
                    const purchaseOrderDetail = await dynamicDataGetService("purchase_orders", "purchase_order_id", formData.purchase_order_id);

                    // Send email
                    const orderVendorId = purchaseOrderDetail?.data?.vendor_id;
                    const vendorDetail = await dynamicDataGetService("busnpartner", "BusnPartnerId", orderVendorId);
                    const purchaseOrdersLink = `${WEB_APP_URL}/site/vendor/purchase-order-details/${formData.purchase_order_id}`;
                    const subject = 'Purchase order has been cancelled';
                    const html = `
                            <p>The status of your purchase order <b>${purchaseOrderDetail?.data.po_number}</b> has been cancelled.</p><br>
                            <a href="${purchaseOrdersLink}">View Purchase Order</a>
                        `;
                    sendEmailFunc('admin@sheebasite.com', subject, html);
                }


                return response;

            });

            response = responePurchaseOrderUpdate;


            // //--now insert new row for order status mapping
            // const columnsOrderStatusMapping: any = {
            //     purchase_order_id: formData.purchase_order_id,
            //     status_id: formData.status_id,
            //     is_active: 1,
            //     created_on: new Date(),
            //     created_by: formData.createByUserId,
            // };
            // response = await dynamicDataInsertService("purchase_order_status_mapping", "order_status_mapping_id", null, true, columnsOrderStatusMapping);



        } catch (error) {
            console.error('Error executing insert/update proudct details:', error);
            throw error;
        }

        return response;
    }


}

export default OrdersService;
