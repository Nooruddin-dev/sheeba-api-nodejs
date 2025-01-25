import { withConnectionDatabase } from "../configurations/db";
import { ProductionEntriesTypesEnum, ProductionEntryProductUsageType } from "../models/enum/GlobalEnums";
import { DynamicCud } from "./dynamic-crud.service";

export class ProductionEntryService {
    public async create(payload: any, user: any): Promise<any> {
        return withConnectionDatabase(async (connection) => {
            try {
                await connection.beginTransaction();
                const productionEntryTableValue = {
                    job_card_id: payload.jobCardId,
                    machine_id: payload.machineId,
                    date: new Date(payload.date),
                    start_time: payload.startTime,
                    end_time: payload.endTime,
                    created_by: user.id
                };
                const { insertId: productEntryId } = await DynamicCud.insert('production_entry', productionEntryTableValue, connection);

                const productionEntryProductTableValues: any[] = [];
                payload.consumedMaterials.forEach((material: any) => {
                    productionEntryProductTableValues.push({
                        production_entry_id: productEntryId,
                        job_card_id: payload.jobCardId,
                        machine_id: payload.machineId,
                        product_id: material.id,
                        quantity: material.quantity,
                        gross_weight: material.grossWeight,
                        waste_weight: material.wasteWeight,
                        tare: material.tareWeight,
                        net_weight: material.netWeight,
                        percentage: material.percentage,
                        usage_type: ProductionEntryProductUsageType.Consumed,
                        created_by: user.id
                    });
                });
                payload.producedMaterials.forEach((material: any) => {
                    productionEntryProductTableValues.push({
                        production_entry_id: productEntryId,
                        job_card_id: payload.jobCardId,
                        machine_id: payload.machineId,
                        product_id: material.id,
                        quantity: material.quantity,
                        gross_weight: material.grossWeight,
                        waste_weight: material.wasteWeight,
                        tare: material.tareWeight,
                        net_weight: material.netWeight,
                        percentage: material.percentage,
                        usage_type: ProductionEntryProductUsageType.Produced,
                        created_by: user.id
                    });
                });
                await DynamicCud.bulkInsert('production_entry_product', productionEntryProductTableValues, connection);

                const [productionEntryProductResult]: any = await connection.query(`
                    SELECT
                        production_entry_id as productionEntryId,
                        product_id as productId,
                        gross_weight as grossWeight,
                        quantity as quantity,
                        usage_type as usageType
                    FROM
                        production_entry_product
                    WHERE
                        production_entry_id = ?
                `, productEntryId);


                const productIds = new Set();
                const inventoryLedgerTableValues: any[] = []
                productionEntryProductResult.forEach((data: any) => {
                    productIds.add(data.productId);
                    inventoryLedgerTableValues.push({
                        productid: data.productId,
                        foreign_key_table_name: 'production_entry_product',
                        foreign_key_name: 'id',
                        foreign_key_value: data.productionEntryId,
                        quantity: data.usageType === ProductionEntryProductUsageType.Produced ? data.quantity : (data.quantity * -1),
                        weight_quantity_value: data.usageType === ProductionEntryProductUsageType.Produced ? data.grossWeight : (data.grossWeight * -1),
                        action_type: ProductionEntriesTypesEnum.NewProductionEntry,
                        created_at: new Date()
                    })
                });
                await DynamicCud.bulkInsert('inventory_ledger', inventoryLedgerTableValues, connection);

                const [inventoryLedgerResult]: any = await connection.query(`
                    SELECT
                        productid as productId,
                        sum(weight_quantity_value) as weight,
                        sum(quantity) as quantity
                    FROM
                        inventory_ledger
                    WHERE
                        productid IN (?)
                    GROUP BY
                        productid;
                `, [Array.from(productIds)]);

                const promises = inventoryLedgerResult.map((data: any) => {
                    const productTableValue = { stockquantity: data.quantity, weight_value: data.weight };
                    return DynamicCud.update('products', data.productId, 'productid', productTableValue, connection);
                });
                await Promise.all(promises);

                await connection.commit();

                return { message: 'Production entry created successfully' };
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        });
    }

    public async getByFilter(filter: any): Promise<any> {
        return withConnectionDatabase(async (connection) => {
            try {
                const whereClauses: string[] = [];
                const params: any[] = [];

                if (filter.jobCardNo) {
                    whereClauses.push('jc.job_card_no = ?');
                    params.push(`${filter.jobCardNo}%`);
                }

                if (filter.machineName) {
                    whereClauses.push('m.machine_name LIKE ?');
                    params.push(`${filter.machineName}%`);
                }

                if (filter.productName) {
                    whereClauses.push('(p.product_name LIKE ? OR p.sku LIKE ?)');
                    params.push(`${filter.productName}%`);
                    params.push(`${filter.productName}%`);
                }

                params.push(parseInt(filter?.pageSize, 10) ?? 25);
                params.push(parseInt(filter?.page, 10) ?? 0);

                const dataQuery = `
                    SELECT 
                        jc.job_card_no as jobCardNo,
                        m.machine_name as machineName,
                        p.product_name as productName,
                        p.sku as productSku,
                        pe.date as date,
                        pep.quantity as quantity,
                        pep.gross_weight as grossWeight,
                        pep.waste_weight as wasteWeight,
                        pep.net_weight as netWeight
                    FROM
                        production_entry pe
                    JOIN
                        production_entry_product pep
                        ON pep.production_entry_id = pe.id
                    JOIN
                        job_cards_master jc
                        ON jc.job_card_id = pe.job_card_id
                    JOIN
                        machines m
                        ON m.machine_id = pe.machine_id
                    JOIN
                        products p
                        ON p.productid = pep.product_id
                    ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}
                    LIMIT ? OFFSET ?;
                `;
                const [dataResult]: any = await connection.query(dataQuery, params);

                const countQuery = `
                    SELECT 
                        COUNT(pe.id) as total
                    FROM
                        production_entry pe
                    JOIN
                        production_entry_product pep
                        ON pep.production_entry_id = pe.id
                    JOIN
                        job_cards_master jc
                        ON jc.job_card_id = pe.job_card_id
                    JOIN
                        machines m
                        ON m.machine_id = pe.machine_id
                    JOIN
                        products p
                        ON p.productid = pep.product_id
                    ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''};
                `;
                const [countResult]: any = await connection.query(countQuery, params);

                return { totalRecords: countResult[0].total, data: dataResult };
            } finally {
                connection.release();
            }
        });
    }
}