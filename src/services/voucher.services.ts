
import { Pool } from 'mysql2/promise';
import { connectionPool, withConnectionDatabase } from '../configurations/db';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';

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
                    SELECT MTBL.*, prd.product_name
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
                WHERE MTBL.purchase_order_id IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.purchase_order_id DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
            `);

            const finalData: any = results;
            return finalData;

        });


    }



}

export default VoucherServices;