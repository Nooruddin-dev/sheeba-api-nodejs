import { Pool } from 'mysql2/promise';

import { UserEntity } from '../models/user.model';
import connectionPool from '../configurations/db';
import { busnPartnerAddressAssociationModel } from '../models/usersManagement/busnPartnerAddressAssociationModel';
import { busnPartnerPhoneAssociationModel } from '../models/usersManagement/busnPartnerPhoneAssociationModel';
import { IBusnPartnerRequestForm } from '../models/usersManagement/Forms/IBusnPartnerRequestForm';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { IMachineRequestForm } from '../models/machines/IMachineRequestForm';
import { dynamicDataInsertService, dynamicDataUpdateService } from './dynamic.service';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';

class MachinesService {



    public async getMachinesTypesService(FormData: any): Promise<any> {

        const connection = await connectionPool.getConnection();

        try {


            const [rows]: any = await connection.query(`
            SELECT COUNT(*) OVER () as TotalRecords, 
            MTBL.*
            FROM machine_types MTBL
            ORDER BY MTBL.machine_type_id ASC
            LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
        `);

            const results: any = rows;
            return results;

        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            if (connection) {
                connection.end();
            }
        }
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
        const connection = await connectionPool.getConnection();
        let result: any = [];

        try {

            const [rows]: any = await connection.query(`SELECT * FROM machines WHERE machine_name = '${machine_name}' `);
            result = rows ? rows[0] : null;
            return result;

        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            if (connection) {
                connection.end();
            }
        }
    }

    public async getAllMachineService(FormData: any): Promise<any> {

        const connection = await connectionPool.getConnection();

        try {



            let searchParameters = '';

            if (FormData.machine_id > 0) {
                searchParameters += ` AND MTBL.machine_id = ${FormData.machine_id}`;
            }

            if (stringIsNullOrWhiteSpace(FormData.machine_name) == false) {
                searchParameters += ` AND MTBL.machine_name LIKE '%${FormData.machine_name}%' `;
            }



            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*, MTYPE.machine_type_name
                FROM machines MTBL
                INNER JOIN machine_types MTYPE ON MTYPE.machine_type_id   = MTBL.machine_type_id
                WHERE MTBL.machine_id IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.machine_id DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
            `);

            const userData: any = results;
            return userData;

        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }


}

export default MachinesService;
