
import { withConnectionDatabase } from '../configurations/db';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { IMachineRequestForm } from '../models/machines/IMachineRequestForm';
import { dynamicDataInsertService, dynamicDataUpdateService } from './dynamic.service';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { BusinessError } from '../configurations/error';

export default class MachinesService {
    public async autoComplete(value: any): Promise<any> {
        return withConnectionDatabase(async (connection) => {
            try {
                const [results]: any = await connection.query(`
                    SELECT
                       m.machine_id as id,
                       m.machine_name as name,
                       m.machine_type_id as typeId,
                       mt.machine_type_name as typeName
                    FROM 
                        machines m
                    JOIN
                        machine_types mt
                        ON mt.machine_type_id = m.machine_type_id
                    WHERE
                        m.machine_name LIKE ?
                    LIMIT 10;
                `, `${value}%`);

                const finalData: any = results;
                return finalData;
            } finally {
                connection.release();
            }
        });
    }

    public async getMachineSummary(filter: any): Promise<any> {
        if (!filter?.startDate) {
            throw new BusinessError(400, 'Start date is required');
        }

        if (!filter?.endDate) {
            throw new BusinessError(400, 'Start date is required');
        }

        const entries = await withConnectionDatabase(async (connection) => {
            try {
                const [result]: any = await connection.query(`
                    SELECT
                        m.machine_id as machineId,
                        m.machine_name as machineName,
                        mt.machine_type_id as machineTypeId,
                        mt.machine_type_name as machineTypeName,
                        SUM(jpe.waste_value) as waste,
                        SUM(jpe.gross_value) as gross,
                        SUM(jpe.net_value) as net,
                        SUM(jpe.trimming) as trimming,
                        SUM(jpe.rejection) as rejection,
                        SUM(jpe.handle_cutting) as handleCutting
                    FROM
                        job_production_entries jpe
                    JOIN job_cards_master jcm 
                                        ON
                        jcm.job_card_id = jpe.job_card_id
                    JOIN machines m 
                                        ON
                        m.machine_id = jpe.machine_id
                    JOIN machine_types mt  
                                        ON
                        mt.machine_type_id = m.machine_type_id
                    WHERE
                        jpe.created_on BETWEEN ? AND ?
                        AND (jpe.job_card_product_id IS NULL
                            OR jpe.job_card_product_id IN (
                            SELECT
                                productid
                            FROM
                                products p
                            WHERE
                                p.unit_type = 3
                            ))
                    GROUP BY
                        m.machine_id;
                `, [filter.startDate, filter.endDate]);

                return result;
            } finally {
                connection.release();
            }
        });

        const data: any[] = [];
        entries.forEach((entry: any) => {
            const found = data.find((d) => d.machineTypeId === entry.machineTypeId);
            if (found) {
                found.machines.push(entry);
            } else {
                data.push({
                    machineTypeId: entry.machineTypeId,
                    machineTypeName: entry.machineTypeName,
                    machines: [entry],
                });
            }
        });

        return data;
    }

    // To be deprecated
    public async getMachinesTypesService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {

            const offset = (FormData.pageNo - 1) * FormData.pageSize;
            const [rows]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*
                FROM machine_types MTBL
                ORDER BY MTBL.machine_type_id ASC
                LIMIT ${FormData.pageSize} OFFSET ${offset}
            `);

            const results: any = rows;
            return results;

        });
    }

    public async insertUpdateMachineService(formData: IMachineRequestForm): Promise<ServiceResponseInterface> {

        let response: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        try {

            const tableName = 'machines';
            const primaryKeyName = 'machine_id';

            if (formData.machine_id != undefined && formData.machine_id != null && formData.machine_id > 0) {
                const primaryKeyValue = formData.machine_id;

                const columns: any = {
                    machine_name: formData.machine_name,
                    machine_type_id: formData.machine_type_id,
                    is_active: formData.is_active == true || formData?.is_active?.toString() == 'true' || formData?.is_active?.toString() == '1' ? 1 : 0,
                    updated_on: new Date(),
                    updated_by: formData.createByUserId,

                };


                response = await dynamicDataUpdateService(tableName, primaryKeyName, primaryKeyValue, columns);


            } else {

                const primaryKeyValue = null; // null since it's auto-incremented
                const isAutoIncremented = true;


                const columns: any = {
                    machine_name: formData.machine_name,
                    machine_type_id: formData.machine_type_id,
                    is_active: formData.is_active == true || formData?.is_active?.toString() == 'true' || formData?.is_active?.toString() == '1' ? 1 : 0,
                    created_on: new Date(),
                    created_by: formData.createByUserId,


                };

                response = await dynamicDataInsertService(tableName, primaryKeyName, primaryKeyValue, isAutoIncremented, columns);

            }


        } catch (error) {
            console.error('Error executing insert/update machine details:', error);
            throw error;
        }

        return response;
    }

    public async getMachineDetailsByMachineNameService(machine_name: string): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let result: any = [];

            const [rows]: any = await connection.query(`SELECT * FROM machines WHERE machine_name = '${machine_name}' `);
            result = rows ? rows[0] : null;
            return result;

        });

    }

    public async getAllMachineService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let searchParameters = '';

            if (FormData.machine_id > 0) {
                searchParameters += ` AND MTBL.machine_id = ${FormData.machine_id}`;
            }

            if (stringIsNullOrWhiteSpace(FormData.machine_name) == false) {
                searchParameters += ` AND MTBL.machine_name LIKE '%${FormData.machine_name}%' `;
            }



            const offset = (FormData.pageNo - 1) * FormData.pageSize;
            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*, MTYPE.machine_type_name
                FROM machines MTBL
                INNER JOIN machine_types MTYPE ON MTYPE.machine_type_id   = MTBL.machine_type_id
                WHERE MTBL.machine_id IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.machine_id DESC
                LIMIT ${FormData.pageSize} OFFSET ${offset}
            `);

            const userData: any = results;
            return userData;

        });


    }
}
