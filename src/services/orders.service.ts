import { Pool } from 'mysql2/promise';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { dynamicDataGetService, dynamicDataInsertService, dynamicDataUpdateService } from './dynamic.service';
import InventoryService from './inventory.service';
import { IPurchaseOrderRequestForm } from '../models/orders/IPurchaseOrderRequestForm';
import connectionPool from '../configurations/db';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { calculateItemAmount } from '../utils/commonHelpers/OrderHelper';


class OrdersService {

    private inventoryService: InventoryService;

    constructor() {
        this.inventoryService = new InventoryService();
    }


    public async getPurchaseOrderTaxesByOrderId(orderId: any): Promise<any> {

        const connection = await connectionPool.getConnection();

        try {



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


        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            if (connection) {
                try {
                    if (typeof connection.release === 'function') {
                        await connection.release();
                    } else if (typeof connection.end === 'function') {
                        await connection.end();
                    }
                } catch (releaseError) {
                    console.error('Error releasing or ending connection:', releaseError);
                }
            }
        }
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
                // order_tax_total: formData.orderLevelTaxAmount,
                order_total: formData.orderTotal,

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
                        var productDetail = await dynamicDataGetService('Products', 'productid', element.productid);

                        if (productDetail && productDetail?.data && productDetail?.data?.productid > 0) {

                            let po_rate: number = element.price;
                     
                            const columnsPurchaseOrderItem: any = {
                                purchase_order_id: order_id,
                                item_name: productDetail?.data?.product_name,
                                product_id: element.productid,
                                item_description: productDetail?.data?.short_description,
                                code_sku: productDetail?.data?.sku,
                                size: productDetail?.data?.size,
                                quantity: element.quantity,
                                unit: productDetail?.data?.unit_id,
                                po_rate: po_rate,
                                amount: calculateItemAmount(po_rate, element.quantity),
                                tax_percent: element.itemTaxPercent,
                                tax_amount: element.itemTotalTax,
                                item_total: element.itemTotal
                            }
                            var responseOrderItem = await dynamicDataInsertService(purchaseOrderItemsTableMainData.tableName, purchaseOrderItemsTableMainData.primaryKeyName,
                                purchaseOrderItemsTableMainData.primaryKeyValue, purchaseOrderItemsTableMainData.isAutoIncremented, columnsPurchaseOrderItem);




                            //--update item inventory by reducing the quanity of product here
                            const columnsProduct: any = {
                                stockquantity: parseInt(productDetail.data.stockquantity) - parseInt(element.quantity?.toString() ?? '0'),
                                updated_on: new Date(),
                                updated_by: formData.createByUserId,

                            };

                            var responseProduct = await dynamicDataUpdateService('products', 'productid', element.productid, columnsProduct);

                            //--update order item tax if any
                            if (element.product_tax_rule_id && element.product_tax_rule_id > 0) {
                                var taxRuleDetail = await dynamicDataGetService('tax_rules', 'tax_rule_id', element.product_tax_rule_id);
                                if (taxRuleDetail && taxRuleDetail.data.tax_rule_id) {
                                    const columnsOrderItemTax: any = {
                                        purchase_order_id: order_id,
                                        line_item_id: responseOrderItem.primaryKeyValue,
                                        tax_rule_id: taxRuleDetail.data.tax_rule_id,
                                        order_tax_amount: element.itemTotalTax,
                                        order_tax_rate_at_order_time: taxRuleDetail.data.tax_rate,
                                        created_on: new Date(),
                                        created_by: formData.createByUserId,

                                    };
                                    var responseOrderTAx = await dynamicDataInsertService('order_taxes', 'order_tax_id',
                                        null, true, columnsOrderItemTax);

                                }
                            }

                        }

                    }

                }

                //--update order item tax if any
                if (formData.orderLevelTaxRuleId && formData.orderLevelTaxRuleId > 0 && (formData.orderLevelTaxAmount && formData.orderLevelTaxAmount > 0)) {
                    const taxRuleDetailOrderDetail = await dynamicDataGetService('tax_rules', 'tax_rule_id', formData.orderLevelTaxRuleId);
                    if (taxRuleDetailOrderDetail && taxRuleDetailOrderDetail.data.tax_rule_id) {
                        const columnsOrderItemTax: any = {
                            purchase_order_id: order_id,
                            line_item_id: null,
                            tax_rule_id: taxRuleDetailOrderDetail.data.tax_rule_id,
                            order_tax_amount: formData.orderLevelTaxAmount,
                            order_tax_rate_at_order_time: taxRuleDetailOrderDetail.data.tax_rate,
                            created_on: new Date(),
                            created_by: formData.createByUserId,

                        };
                        const responseOrderTAx = await dynamicDataInsertService('order_taxes', 'order_tax_id',
                            null, true, columnsOrderItemTax);

                    }
                }


                var purchaseOrderAllTaxes = await this.getPurchaseOrderTaxesByOrderId(order_id);
                let totalTaxOfOrder = 0;
                if (purchaseOrderAllTaxes && purchaseOrderAllTaxes.length > 0) {
                    const columnNameTax = "order_tax_amount";
                    totalTaxOfOrder = purchaseOrderAllTaxes.reduce((sum: any, item: { order_tax_amount: any; }) => parseInt(sum + parseInt(item.order_tax_amount)), 0);
                }

                //--update purchase order 'po_number
                const poNumber = order_id?.toString().padStart(7, '0');
                const columnsOrderUpdate: any = {
                    po_number: poNumber,
                    order_tax_total: totalTaxOfOrder,
                    updated_on: new Date(),
                    updated_by: formData.createByUserId,

                };
                var responseOrderMain = await dynamicDataUpdateService('purchase_orders', 'purchase_order_id', order_id, columnsOrderUpdate);


            }


        } catch (error) {
            console.error('Error executing insert/update machine details:', error);
            throw error;
        }

        return responseOrderInsert;
    }

    public async getAllPurchaseOrdersListService(FormData: any): Promise<any> {

        const connection = await connectionPool.getConnection();

        try {



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
                sale_repres_user.FirstName as sale_representative_first_name, sale_repres_user.LastName as sale_representative_last_name
                FROM purchase_orders MTBL
                inner join busnpartner vendor on vendor.BusnPartnerId = mtbl.vendor_id
                inner join busnpartner sale_repres_user on sale_repres_user.BusnPartnerId = mtbl.sale_representative_id

                WHERE MTBL.purchase_order_id IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.purchase_order_id DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
            `);

            const finalData: any = results;
            return finalData;

        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            if (connection) {
                await connection.release();
            }
        }
    }



    public async getPurchaseOrderDetailById(purchase_order_id: any): Promise<any> {

        const connection = await connectionPool.getConnection();

        try {



          let orderMain: any = {};


            const [resultsOrderMain]: any = await connection.query(`
                SELECT 
                MTBL.*,
                vendor.FirstName as vendor_first_name, vendor.LastName as vendor_last_name,
                sale_repres_user.FirstName as sale_representative_first_name, sale_repres_user.LastName as sale_representative_last_name
                FROM purchase_orders MTBL
                inner join busnpartner vendor on vendor.BusnPartnerId = mtbl.vendor_id
                inner join busnpartner sale_repres_user on sale_repres_user.BusnPartnerId = mtbl.sale_representative_id
                WHERE MTBL.purchase_order_id = ${purchase_order_id} `);

                debugger
            if (resultsOrderMain && resultsOrderMain.length > 0) {
                 orderMain =  resultsOrderMain[0];

                const [resultsOrderItem]: any = await connection.query(`
                    SELECT 
                    MTBL.*, prd.product_name as product_name
                    FROM purchase_orders_items MTBL
                    inner join products prd on prd.productid =  mtbl.product_id
                    WHERE MTBL.purchase_order_id = ${orderMain.purchase_order_id} `);

                const orderItem: any = resultsOrderItem;
                orderMain.order_items = orderItem;
            }

            return orderMain;

        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            if (connection) {
                await connection.release();
            }
        }
    }


}

export default OrdersService;
