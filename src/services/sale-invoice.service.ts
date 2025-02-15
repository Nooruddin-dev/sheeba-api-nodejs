import { uniqueId } from 'lodash';
import { connectionPool, withConnectionDatabase } from '../configurations/db';
import { dynamicDataInsertServiceNew, dynamicDataUpdateServiceWithConnection } from './dynamic.service';
import { v4 as uuid } from 'uuid';

class SaleInvoiceService {
    constructor() {
    }

    public async createSaleInvoice(param: any) {
        const connection = await connectionPool.getConnection();
        try {
            await connection.beginTransaction();

            // Insert into sale_invoice table
            const saleInvoice = {
                jobCardId: param.jobCardId,
                dispatchId: param.dispatchId,
                saleInvoiceNo: param.invoiceNumber || 'PENDING',
                date: param.date,
                official: param.official,
                notes: param.notes,
                customerName: param.customerName,
                customerAddress: param.customerAddress,
                customerNTN: param.customerNTN,
                customerSTN: param.customerSTN,
                subtotal: param.subtotal,
                discount: param.discount,
                taxPercentage: param.taxPercentage,
                tax: param.tax,
                totalDiscount: param.totalDiscount,
                totalTax: param.totalTax,
                total: param.total,
                createdBy: param.userId,
            };
            const { primaryKeyValue: saleInvoiceId } = await dynamicDataInsertServiceNew('sale_invoice', 'id', null, true, saleInvoice, connection);

            for (const lineItem of param.lineItems) {
                // Insert into sale_invoice_item table
                const saleInvoiceItem = {
                    saleInvoiceId: saleInvoiceId,
                    itemId: uuid(),
                    itemName: lineItem.name,
                    rate: lineItem.rate,
                    quantity: lineItem.quantity,
                    subtotal: lineItem.subtotal,
                    discount: lineItem.discount,
                    salesTax: lineItem.salesTax,
                    salesTaxPercentage: lineItem.salesTaxPercentage,
                    advanceTax: lineItem.advanceTax,
                    advanceTaxPercentage: lineItem.advanceTaxPercentage,
                    furtherTax: lineItem.furtherTax,
                    furtherTaxPercentage: lineItem.furtherTaxPercentage,
                    totalTax: lineItem.totalTax,
                    total: lineItem.total,
                    createdBy: param.userId,
                }
                await dynamicDataInsertServiceNew('sale_invoice_item', 'id', null, true, saleInvoiceItem, connection);
            }

            if (!param.invoiceNumber) {
                const [result]: any = await connection.query('SELECT COUNT(id) as count FROM sale_invoice WHERE official = 0;');
                const saleInvoiceNo = 'S' + (parseInt(result[0].count, 10) + 1).toString().padStart(7, '0');
                await dynamicDataUpdateServiceWithConnection('sale_invoice', 'id', saleInvoiceId as number, { saleInvoiceNo: saleInvoiceNo }, connection);
            }

            await connection.commit();

            return {
                success: true,
                responseMessage: 'Invoice created successfully',
                primaryKeyValue: saleInvoiceId
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    public async getSaleInvoiceByParam(param: any) {
        return withConnectionDatabase(async (connection: any) => {
            let conditions = [];
            if (param.saleInvoiceNo) {
                conditions.push(`si.saleInvoiceNo = '${param.saleInvoiceNo}'`);
            }

            if (param.dispatchNo) {
                conditions.push(`si.dispatchNo = '${param.dispatchNo}'`);
            }

            if (param.companyName) {
                conditions.push(`jc.company_name like '%${param.companyName}%'`);
            }

            const offset = (param.page - 1) * 10;

            const dataQuery = `
                    SELECT
                        si.id,
                        si.date,
                        si.customerName,
                        si.saleInvoiceNo,
                        jc.job_card_no as jobCardNo,
                        jc.company_name as companyName,
                        d.card_dispatch_no as dispatchNo,
                        si.total
                    FROM sale_invoice si
                    INNER JOIN job_cards_master jc
                        ON jc.job_card_id = si.jobCardId
                    INNER JOIN job_card_dispatch_data d
                        ON d.card_dispatch_info_id = si.dispatchId
                    ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
                    LIMIT 10 OFFSET ${offset};`;
            const countQuery = `
                    SELECT
                        count(si.id) as count
                    FROM sale_invoice si
                    INNER JOIN job_cards_master jc
                        ON jc.job_card_id = si.jobCardId
                    INNER JOIN job_card_dispatch_data d
                        ON d.card_dispatch_info_id = si.dispatchId
                    ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''};`;

            const [[dataResult], [countResult]] = await Promise.all([
                connection.query(dataQuery),
                connection.query(countQuery)
            ]);

            console.log(dataResult, countResult);

            return {
                total: countResult[0]?.count || 0,
                invoices: dataResult
            };
        });

    }

    public async getSaleInvoiceById(id: number) {
        return withConnectionDatabase(async (connection: any) => {
            try {
                const [invoice] = await connection.query(`
                    SELECT
                        si.*,
                        jc.job_card_id as jobCardId,
                        jc.job_card_no as jobCardNo,
                        jc.company_name as companyName,
                        d.card_dispatch_info_id as dispatchId,
                        d.card_dispatch_no as dispatchNo,
                        d.item_name as itemName,
                        dci.dispatch_unit_id as unitId
                    FROM sale_invoice si
                    INNER JOIN job_cards_master jc
                        ON jc.job_card_id = si.jobCardId
                    INNER JOIN job_card_dispatch_data d
                        ON d.card_dispatch_info_id = si.dispatchId
                    LEFT JOIN delivery_challan_items dci
                        ON dci.card_dispatch_info_id = d.card_dispatch_info_id
                    WHERE si.id = ?;
                `, id);


                if (invoice.length) {
                    const [lineItems] = await connection.query(`
                    SELECT
                        sii.*,
                        ${invoice[0].unitId} as unitId
                    FROM sale_invoice_item sii
                    WHERE sii.saleInvoiceId = ?;
                `, id);
                    delete invoice[0].unitId;
                    return {
                        ...invoice[0],
                        lineItems
                    };
                }
            } catch (error) {
                console.log(error);
                throw error;
            }
        });

    }
}

export default SaleInvoiceService;

