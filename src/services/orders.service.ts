import { Pool } from 'mysql2/promise';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { dynamicDataGetService, dynamicDataInsertService, dynamicDataUpdateService } from './dynamic.service';
import InventoryService from './inventory.service';
import { IPurchaseOrderRequestForm } from '../models/orders/IPurchaseOrderRequestForm';
import { connectionPool, withConnectionDatabase } from '../configurations/db';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { calculateItemAmount } from '../utils/commonHelpers/OrderHelper';
import { PurchaseOrderStatusTypesEnum } from '../models/enum/GlobalEnums';
import { IPurchaseOrderStatusUpdateRequestForm } from '../models/orders/IPurchaseOrderStatusUpdateRequestForm';
import { sendEmailFunc } from './EmailService';
import { SUPER_ADMIN_EMAIL, WEBSITE_BASE_URL } from '../configurations/config';
import { v4 as uuidv4 } from 'uuid';


class OrdersService {

    private inventoryService: InventoryService;

    constructor() {
        this.inventoryService = new InventoryService();
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

    public async createPurchaseOrderService(formData: IPurchaseOrderRequestForm): Promise<ServiceResponseInterface> {

        let responseOrderInsert: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        try {




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
                // order_tax_total: formData.orderLevelTaxAmount,
                order_total: formData.orderTotal,
                order_guid: uuidv4(),

                created_on: new Date(),
                created_by: formData.createByUserId,


            };

            responseOrderInsert = await dynamicDataInsertService(purchaseOrderTableMainData.tableName, purchaseOrderTableMainData.primaryKeyName, purchaseOrderTableMainData.primaryKeyValue,
                purchaseOrderTableMainData.isAutoIncremented, columnsPurchaseOrder);
            if (responseOrderInsert && responseOrderInsert.success == true && responseOrderInsert.primaryKeyValue) {

                const order_id = responseOrderInsert.primaryKeyValue;


                //--inser into purchase order items
                let purchaseOrderItemsTableMainData = {
                    tableName: 'purchase_orders_items',
                    primaryKeyName: 'line_item_id',
                    primaryKeyValue: null,
                    isAutoIncremented: true
                }

                if (formData.cartAllProducts && formData.cartAllProducts.length > 0) {

                    for (const element of formData.cartAllProducts) {

                        //--get product details by id
                        var productDetail = await dynamicDataGetService('products', 'productid', element.productid);

                        if (productDetail && productDetail?.data && productDetail?.data?.productid > 0) {

                            let po_rate: number = element.price;

                            const columnsPurchaseOrderItem: any = {
                                purchase_order_id: order_id,
                                item_name: productDetail?.data?.product_name,
                                product_id: element.productid,
                                item_description: productDetail?.data?.short_description,
                                code_sku: productDetail?.data?.sku,

                                quantity: element.weight_value,
                                weight: element.weight_value,

                                po_rate: po_rate,
                                amount: calculateItemAmount(po_rate, element.weight_value),

                                item_units_info_json: element.product_units_info && element.product_units_info.length > 0 ? JSON.stringify(element.product_units_info) : null,

                                tax_percent: element.itemTaxPercent,

                                tax_rate_type: element.tax_rate_type,
                                tax_amount: element.itemTotalTax,

                                item_total: element.itemTotal
                            }
                            var responseOrderItem = await dynamicDataInsertService(purchaseOrderItemsTableMainData.tableName, purchaseOrderItemsTableMainData.primaryKeyName,
                                purchaseOrderItemsTableMainData.primaryKeyValue, purchaseOrderItemsTableMainData.isAutoIncremented, columnsPurchaseOrderItem);
                            const prodColUpdate = { remaining_weight: (productDetail.data?.remaining_weight ?? 0) + element.weight_value };
                            await dynamicDataUpdateService('products', 'productid', element.productid, prodColUpdate);




                            //--update item inventory by reducing the quanity of product here
                            // const columnsProduct: any = {
                            //     stockquantity: parseInt(productDetail.data.stockquantity) - parseInt(element.quantity?.toString() ?? '0'),
                            //     updated_on: new Date(),
                            //     updated_by: formData.createByUserId,

                            // };

                            // var responseProduct = await dynamicDataUpdateService('products', 'productid', element.productid, columnsProduct);



                            //--update order item tax if any
                            if (element.tax_rate_type != undefined && element.tax_rate_type != null && stringIsNullOrWhiteSpace(element.tax_rate_type) == false) {
                                const columnsOrderItemTax: any = {
                                    purchase_order_id: order_id,
                                    line_item_id: responseOrderItem.primaryKeyValue,
                                    tax_rate_type: element.tax_rate_type,
                                    tax_value: element.tax_value,
                                    order_tax_amount: element.itemTotalTax,
                                    created_on: new Date(),
                                    created_by: formData.createByUserId,

                                };
                                var responseOrderTAx = await dynamicDataInsertService('order_taxes', 'order_tax_id',
                                    null, true, columnsOrderItemTax);
                            }

                        }

                    }

                }


                //--update order item tax if any
                if (formData.orderLevelTaxRateType && !stringIsNullOrWhiteSpace(formData.orderLevelTaxRateType) && (formData.orderLevelTaxAmount && formData.orderLevelTaxAmount > 0)) {
                    const columnsOrderItemTax: any = {
                        purchase_order_id: order_id,
                        line_item_id: null,
                        tax_rate_type: formData.orderLevelTaxRateType,
                        tax_value: formData.orderLevelTaxValue,
                        order_tax_amount: formData.orderLevelTaxAmount,
                        created_on: new Date(),
                        created_by: formData.createByUserId,

                    };
                    const responseOrderTAx = await dynamicDataInsertService('order_taxes', 'order_tax_id',
                        null, true, columnsOrderItemTax);
                }


                var purchaseOrderAllTaxes = await this.getPurchaseOrderTaxesByOrderId(order_id);
                let totalTaxOfOrder = 0;
                if (purchaseOrderAllTaxes && purchaseOrderAllTaxes.length > 0) {
                    const columnNameTax = "order_tax_amount";
                    totalTaxOfOrder = purchaseOrderAllTaxes.reduce((sum: any, item: { order_tax_amount: any; }) => parseInt(sum + parseInt(item.order_tax_amount)), 0);
                }

                //--update purchase order 'po_number
                const poNumber = 'PO' + order_id?.toString().padStart(7, '0');
                const columnsOrderUpdate: any = {
                    po_number: poNumber,
                    order_tax_total: totalTaxOfOrder,
                    updated_on: new Date(),
                    updated_by: formData.createByUserId,

                };
                var responseOrderMain = await dynamicDataUpdateService('purchase_orders', 'purchase_order_id', order_id, columnsOrderUpdate);


                //--insert into order status mapping table "purchase_order_status_mapping"
                const columnsOrderStatusMappings: any = {
                    purchase_order_id: order_id,
                    status_id: PurchaseOrderStatusTypesEnum.Pending,
                    is_active: 1,
                    created_on: new Date(),
                    created_by: formData.createByUserId,
                };
                const responseOrderStatusMapping = await dynamicDataInsertService('purchase_order_status_mapping', 'order_status_mapping_id',
                    null, true, columnsOrderStatusMappings);


                //Send email
                const purchaseOrdersLink = `${WEBSITE_BASE_URL}/site/purchase-orders-list`
                const subject = 'New Purchase Order Created';
      
                const html = `
                        <b>A new purchase order has been created.</b><br>
                        <p>Order ID: ${poNumber}</p>
                        <a href="${purchaseOrdersLink}">View Purchase Orders</a>
                    `;

                sendEmailFunc(SUPER_ADMIN_EMAIL, subject, html);



            }


        } catch (error) {
            console.error('Error executing insert/update machine details:', error);
            throw error;
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
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
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
                    MTBL.*, prd.product_name as product_name
                    FROM purchase_orders_items MTBL
                    inner join products prd on prd.productid =  MTBL.product_id
                    WHERE MTBL.purchase_order_id = ${orderMain.purchase_order_id} `);

                const orderItem: any = resultsOrderItem;
                orderMain.order_items = orderItem;



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

                //--now insert new row for order status mapping
                const columnsOrderStatusMapping: any = {
                    purchase_order_id: formData.purchase_order_id,
                    status_id: formData.status_id,
                    is_active: 1,
                    created_on: new Date(),
                    created_by: formData.createByUserId,
                };
                response = await dynamicDataInsertService("purchase_order_status_mapping", "order_status_mapping_id", null, true, columnsOrderStatusMapping);

                //--now send email to vendor on status approval
                if(formData.status_id == PurchaseOrderStatusTypesEnum.Approve){
                    const purchaseOrderDetail = await dynamicDataGetService("purchase_orders", "purchase_order_id" , formData.purchase_order_id);
                    const orderVendorId = purchaseOrderDetail?.data?.vendor_id;
                    const vendorDetail = await dynamicDataGetService("busnpartner", "BusnPartnerId" , orderVendorId);

                    const purchaseOrdersLink = `${WEBSITE_BASE_URL}/site/vendor/purchase-order-details/${formData.purchase_order_id}`;
                    const subject = 'Purchase order has been approved';
                    
                    const html = `
                            <p>The status of your purchase order <b>${purchaseOrderDetail?.data.po_number}</b> has been approved.</p><br>
                            <a href="${purchaseOrdersLink}">View Purchase Orders</a>
                        `;
    
                    sendEmailFunc(vendorDetail?.data?.EmailAddress, subject, html);
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
