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
            connection.beginTransaction();

            // Insert into sale_invoice table
            const saleInvoice = {
                jobCardId: param.jobCardId,
                dispatchId: param.dispatchId,
                saleInvoiceNo: 'PENDING',
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
                    salesTax: lineItem.tax,
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

            const saleInvoiceNo = 'S' + (saleInvoiceId as number).toString().padStart(7, '0');
            await dynamicDataUpdateServiceWithConnection('sale_invoice', 'id', saleInvoiceId as number, { saleInvoiceNo: saleInvoiceNo }, connection);

            connection.commit();

            return {
                success: true,
                responseMessage: '',
                primaryKeyValue: saleInvoiceId
            };
        } catch (error) {
            console.error(error);
            connection.rollback();
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
    }

    public async getSaleInvoiceByParam(param: any) {
        return withConnectionDatabase(async (connection: any) => {
            let conditions = [];
            if (param.jobCardNo) {
                conditions.push(`jc.job_card_no = ${param.jobCardNo}`);
            }

            if (param.saleInvoiceNo) {
                conditions.push(`si.saleInvoiceNo = ${param.saleInvoiceNo}`);
            }

            if (param.dispatchNo) {
                conditions.push(`si.dispatchNo = ${param.dispatchNo}`);
            }

            if (param.saleInvoiceNo) {
                conditions.push(`jc.company_name = ${param.companyName}`);
            }

            const [result] = await connection.query(`
                    SELECT
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
                    ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''};
                `);

            return {
                total: 100,
                invoices: result
            };
        });

    }

    public async getSaleInvoiceById(id: number) {
        return withConnectionDatabase(async (connection: any) => {
            const [result] = await connection.query(`
                    SELECT
                        si.*,
                        jc.job_card_id as jobCardId,
                        jc.job_card_no as jobCardNo
                        d.card_dispatch_info_id as dispatchId,
                        d.card_dispatch_no as dispatchNo,
                    FROM sale_invoice si
                    INNER JOIN job_cards_master jc
                        ON jc.job_card_id = si.jobCardId
                    INNER JOIN job_card_dispatch_data d
                        ON d.card_dispatch_info_id = si.dispatchId
                    WHERE si.id = ?;
                `, id);

            return result;
        });

    }
}

export default SaleInvoiceService;
function uuidv4() {
    throw new Error('Function not implemented.');
}

