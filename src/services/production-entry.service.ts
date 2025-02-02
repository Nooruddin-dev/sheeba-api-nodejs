import { PoolConnection } from "mysql2/promise";
import { withConnectionDatabase } from "../configurations/db";
import { ProductionEntriesTypesEnum, ProductionEntryProductUsageType } from "../models/enum/GlobalEnums";
import { DynamicCud } from "./dynamic-crud.service";

export class ProductionEntryService {
    public async create(payload: any, user: any): Promise<any> {
        return withConnectionDatabase(async (connection) => {
            try {
                await connection.beginTransaction();

                const consumedMaterialsPromises = payload.consumedMaterials.map(async (material: any) => {
                    return this.createWithConnection(payload, material, user, false, connection);
                });
                const producedMaterialsPromises = payload.producedMaterials.map((material: any) => {
                    return this.createWithConnection(payload, material, user, true, connection);
                });

                await Promise.all([...consumedMaterialsPromises, ...producedMaterialsPromises]);

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
                    whereClauses.push('jc.job_card_no LIKE ?');
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
                        pe.created_on as date,
                        pe.gross_value as grossWeight,
                        pe.waste_value as wasteWeight,
                        pe.net_value as netWeight,
                        pe.weight_value as quantity,
                        pe.tare_core as tareWeight
                    FROM
                        job_production_entries pe
                    JOIN
                        job_cards_master jc
                        ON jc.job_card_id = pe.job_card_id
                    JOIN
                        machines m
                        ON m.machine_id = pe.machine_id
                    LEFT JOIN
                        products p
                        ON p.productid = pe.job_card_product_id
                    ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}
                    ORDER BY
                        pe.created_on DESC
                    LIMIT ? OFFSET ?;
                `;

                console.log('dataQuery', dataQuery);
                const [dataResult]: any = await connection.query(dataQuery, params);

                const countQuery = `
                    SELECT 
                        COUNT(pe.production_entry_id) as total
                    FROM
                        job_production_entries pe
                    JOIN
                        job_cards_master jc
                        ON jc.job_card_id = pe.job_card_id
                    JOIN
                        machines m
                        ON m.machine_id = pe.machine_id
                    JOIN
                        products p
                        ON p.productid = pe.job_card_product_id
                    ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''};
                `;
                const [countResult]: any = await connection.query(countQuery, params);

                return { totalRecords: countResult[0].total, data: dataResult };
            } finally {
                connection.release();
            }
        });
    }

    private async createWithConnection(payload: any, material: any, user: any, isProduced: boolean, connection: PoolConnection): Promise<void> {
        // Create entry
        const jobProductionEntryTableValue = {
            job_card_id: payload.jobCardId,
            machine_id: payload.machineId,
            job_card_product_id: material.id,
            created_on: new Date(payload.date),
            start_time: payload.startTime,
            end_time: payload.endTime,
            weight_value: material.quantity,
            gross_value: material.grossWeight,
            waste_value: material.wasteWeight,
            tare_core: material.tareWeight,
            net_value: material.netWeight,
            created_by: user.id
        };
        const { insertId: productionEntryId } = await DynamicCud.insert('job_production_entries', jobProductionEntryTableValue, connection);

        // Update inventory
        if (material.id) {
            const inventoryLedgerTableValue = {
                productid: material.id,
                foreign_key_table_name: 'production_entry_product',
                foreign_key_name: 'production_entry_id',
                foreign_key_value: productionEntryId,
                quantity: parseFloat(isProduced ? material.quantity : (material.quantity * -1)),
                weight_quantity_value: parseFloat(isProduced ? material.weightWithoutTare : (material.weightWithoutTare * -1)),
                action_type: ProductionEntriesTypesEnum.NewProductionEntry,
                created_at: new Date()
            }
            await DynamicCud.insert('inventory_ledger', inventoryLedgerTableValue, connection);


            const [inventoryLedgerResult]: any = await connection.query(`
                SELECT
                    productid as productId,
                    sum(weight_quantity_value) as weight,
                    sum(quantity) as quantity
                FROM
                    inventory_ledger
                WHERE
                    productid = ?;
            `, [material.id]);
            const productTableValue = {
                stockquantity: parseFloat(inventoryLedgerResult[0].quantity),
                weight_value: parseFloat(inventoryLedgerResult[0].weight)
            };
            await DynamicCud.update('products', inventoryLedgerResult[0].productId, 'productid', productTableValue, connection);
        }

        //Update job card status
        const [machineTypeResult]: any = await connection.query(`
            SELECT
                mt.machine_type_name as status
            FROM
                machines m
            JOIN
                machine_types mt
                ON mt.machine_type_id = m.machine_type_id
            WHERE
                m.machine_id = ?;
        `, [payload.machineId]);
        const jobCardMasterTableValue = {
            job_status: machineTypeResult[0].status
        }
        await DynamicCud.update('job_cards_master', payload.jobCardId, 'job_card_id', jobCardMasterTableValue, connection);
    }
}