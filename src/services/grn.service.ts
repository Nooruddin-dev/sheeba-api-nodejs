import { PoolConnection } from 'mysql2/promise';
import { connectionPool, withConnectionDatabase } from '../configurations/db';
import { BusinessError } from '../configurations/error';
import { GrnVoucherStatus, ProductionEntriesTypesEnum } from '../models/enum/GlobalEnums';
import { DynamicCud } from './dynamic-crud.service';
import { dynamicDataInsertServiceNew, dynamicDataUpdateServiceWithConnection } from './dynamic.service';
import InventoryService from './inventory.service';

class GrnService {
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

                if (filter.status) {
                    whereClauses.push('gv.status = ?');
                    params.push(filter.status);
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

    public async upsertGrn(req: any): Promise<any> {
        const connection = await connectionPool.getConnection();
        let existingVoucher = undefined;

        try {
            await connection.beginTransaction();

            if (req.id) {
                const [result]: any = await connection.query(`SELECT voucher_id, voucher_number FROM grn_voucher WHERE voucher_id = ?;`, [req.id]);
                if (!result || result.length === 0) {
                    throw new BusinessError(404, 'GRN Voucher not found');
                }
                existingVoucher = result[0];
            }

            // Insert into grn_voucher table
            const grnVoucher = {
                voucher_number: '', // to be set later
                po_number: req.poNumber,
                purchase_order_id: req.purchaseOrderId,
                receiver_name: req.receiverName,
                receiver_contact: req.receiverContact,
                grn_date: req.date,
                show_company_detail: req.official,
                subtotal: req.subtotal,
                total: req.total,
                created_on: new Date(),
                created_by: req.userId,
            };
            const { primaryKeyValue: newVoucherId } = await dynamicDataInsertServiceNew('grn_voucher', 'id', null, true, grnVoucher, connection);

            for (const lineItem of req.lineItems) {
                // Insert into grn_voucher_item table
                const grnVoucherItem = {
                    voucher_id: newVoucherId,
                    product_id: lineItem.productId,
                    order_line_item_id: lineItem.id,
                    product_name: lineItem.productName,
                    product_sku_code: lineItem.sku,
                    quantity: lineItem.quantity,
                    weight: lineItem.weight,
                    cost: lineItem.cost,
                    cost_inclusive: lineItem.costInclusive,
                    total: lineItem.total,
                }
                await dynamicDataInsertServiceNew('grn_voucher_line_items', 'id', null, true, grnVoucherItem, connection);
            }

            if (!existingVoucher) {
                const context = 'Grn';
                const [result]: any = await connection.query(`SELECT id, prefix, sequence, minlength FROM entity_sequence WHERE context = ?;`, [context]);
                const nextSequence = parseInt(result[0].sequence, 10) + 1;
                const grnVoucherNo = result[0].prefix + (nextSequence).toString().padStart(result[0].minlength, '0');
                await dynamicDataUpdateServiceWithConnection('grn_voucher', 'voucher_id', newVoucherId as number, { voucher_number: grnVoucherNo }, connection);
                await dynamicDataUpdateServiceWithConnection('entity_sequence', 'id', result[0].id as number, { sequence: nextSequence }, connection);
            } else {
                await dynamicDataUpdateServiceWithConnection('grn_voucher', 'voucher_id', newVoucherId as number, { voucher_number: existingVoucher.voucher_number }, connection);
                await this.cancelGrnWithConnection(existingVoucher.voucher_id, connection);
            }

            await connection.commit();

            return {
                success: true,
                responseMessage: `GRN Voucher ${existingVoucher ? 'updated' : 'created'} successfully`,
                primaryKeyValue: newVoucherId
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    public async getById(id: number): Promise<any> {
        return await withConnectionDatabase(async (connection: PoolConnection) => {
            const grnVoucherQuery: any = connection.query(`
                    SELECT 
                        voucher_id as id,
                        voucher_number as voucherNumber,
                        po_number as poNumber,
                        purchase_order_id as purchaseOrderId,
                        receiver_name as receiverName,
                        receiver_contact as receiverContact,
                        grn_date as date,
                        show_company_detail as isOfficial,
                        subtotal,
                        total,
                        status
                    FROM 
                        grn_voucher gv
                    WHERE 
                        gv.voucher_id = ?`, [id]);

            const grnVoucherItemsQuery: any = connection.query(`
                    SELECT 
                        order_line_item_id as orderLineItemId,
                        product_sku_code as sku,
                        product_id as productId,
                        product_name as productName,
                        quantity,
                        weight,
                        cost,
                        cost_inclusive as costInclusive,
                        total
                    FROM 
                        grn_voucher_line_items gvli
                    WHERE 
                        gvli.voucher_id = ?`, [id]);

            const [[grnVoucher], [grnVoucherItems]] = await Promise.all([grnVoucherQuery, grnVoucherItemsQuery]);

            if (!grnVoucher) {
                throw new BusinessError(404, 'GRN voucher not found');
            }

            return {
                ...grnVoucher[0],
                lineItems: grnVoucherItems
            }
        });
    }

    private async cancelGrnWithConnection(id: number, connection: PoolConnection): Promise<void> {
        const [gvRows]: any[] = await connection.query(`
                            SELECT
                                gv.status
                            FROM
                                grn_voucher gv
                            WHERE
                                gv.voucher_id = ?
                        `, [id]);
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
                        `, [id]);

        for (const row of gvliRows) {
            await this.inventoryService.updateInventory({
                productId: row.product_id,
                quantity: parseFloat(row.quantity) * -1,
                weight: parseFloat(row.weight) * -1,
                actionType: ProductionEntriesTypesEnum.CancelGRN,
                contextId: id,
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

        await DynamicCud.update('grn_voucher', id, 'voucher_id', { status: GrnVoucherStatus.Cancelled }, connection);
    }
}

export default GrnService;

