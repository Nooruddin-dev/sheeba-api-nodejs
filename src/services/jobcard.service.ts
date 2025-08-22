import { connectionPool, withConnectionDatabase } from '../configurations/db';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { IJobCardRequestForm } from '../models/jobCardManagement/IJobCardRequestForm';
import { dynamicDataGetServiceWithConnection, dynamicDataInsertServiceNew, dynamicDataUpdateServiceWithConnection } from './dynamic.service';
import { JobCardStatusEnum } from '../models/jobCardManagement/IJobCardStatus';
import { IJobProductionEntryForm } from '../models/jobCardManagement/IJobProductionEntryForm';
import { ProductionEntriesTypesEnum, ProductSourceEnum } from '../models/enum/GlobalEnums';
import { getWeightAndQtyFromLedger } from './common.service';
import { IJobCardDispatchInfoForm } from '../models/jobCardManagement/IJobCardDispatchInfoForm';
import InventoryService from './inventory.service';
import { BusinessError } from '../configurations/error';
import { DynamicCud } from './dynamic-crud.service';

export default class JobCardService {

    private readonly inventoryService: InventoryService;

    constructor() {
        this.inventoryService = new InventoryService();
    }

    public async autoComplete(value: any): Promise<any> {
        return withConnectionDatabase(async (connection) => {
            try {
                const [results]: any = await connection.query(`
                    SELECT
                       jc.job_card_id as id,
                       jc.job_card_no as jobCardNo,
                       jc.weight_qty as quantity,
                       jc.company_name as companyName,
                       jc.product_name as productName,
                       jc.extruder_product_id as extruderProductId
                    FROM 
                        job_cards_master jc
                    WHERE
                        jc.job_card_no LIKE ?
                    LIMIT 10;
                `, `%${value}%`);
                const finalData: any = results;
                return finalData;
            } finally {
                connection.release();
            }
        });
    }

    public async getJobSummaryReport(filter: any): Promise<any> {
        if (!filter?.jobCardNo && !filter?.startJobCardNo) {
            throw new BusinessError(400, 'Either job card number or job card range is required');
        }

        if ((filter?.startJobCardNo && !filter?.endJobCardNo) || (filter?.endJobCardNo && !filter?.startJobCardNo)) {
            throw new BusinessError(400, 'Incomplete job card number range');
        }

        const jobCardNumbers: string[] = [];
        if (filter?.startJobCardNo && filter?.endJobCardNo) {
            const start = Number(filter.startJobCardNo.replace('JC', ''));
            const end = Number(filter.endJobCardNo.replace('JC', ''));

            const diff = end - start;
            if (diff < 0 || diff === 0) {
                throw new BusinessError(400, 'Invalid job card number range');
            }

            if (diff > 50) {
                throw new BusinessError(400, 'Job card number range cannot exceed 50');
            }

            for (let i = start; i <= end; i++) {
                jobCardNumbers.push(`JC${i.toString().padStart(7, '0')}`);
            }
        }

        const data: {
            id: number,
            jobCardNo: string,
            companyName: string,
            productName: string,
            machines: any[],
            dispatches: any[]
        }[] = [];

        const result = await withConnectionDatabase(async (connection) => {
            try {
                const [jcResult]: any = await connection.query(`
                    SELECT
                        jc.job_card_id as id,
                        jc.job_card_no as jobCardNo,
                        jc.company_name as companyName,
                        jc.product_name as productName
                    FROM
                        job_cards_master jc
                    WHERE
                        jc.job_card_no IN (?)
                `, jobCardNumbers.length > 0 ? [jobCardNumbers] : [filter.jobCardNo]);

                if (!jcResult?.length) {
                    return {
                        jobCards: [],
                        machines: [],
                        dispatches: []
                    }
                }

                const [jpeResult]: any = await connection.query(`
                SELECT
                    jcm.job_card_id as jobCardId,
                    m.machine_id as machineId,
                    m.machine_name as machineName,
                    mt.machine_type_id as machineTypeId,
                    mt.machine_type_name as machineTypeName,
                    p.productid as productId,
                    p.product_name as productName,
                    jpe.weight_value as quantity,
                    jpe.waste_value as waste,
                    jpe.gross_value as gross,
                    jpe.created_on as date,
                    jpe.net_value as net,
                    jpe.tare_core as tare,
                    jpe.trimming as trimming,
                    jpe.rejection as rejection,
                    jpe.handle_cutting as handleCutting
                FROM
                    job_production_entries jpe
                JOIN job_cards_master jcm 
                                ON
                    jcm.job_card_id = jpe.job_card_id
                LEFT JOIN products p 
                                ON
                    p.productid = jpe.job_card_product_id
                JOIN machines m 
                                ON
                    m.machine_id = jpe.machine_id
                JOIN machine_types mt  
                                ON
                    mt.machine_type_id = m.machine_type_id
                WHERE
                    jpe.cancelled = 0
                    AND jcm.job_card_id in (?)
                    AND (jpe.job_card_product_id IS NULL
                        OR jpe.job_card_product_id IN (
                        SELECT
                            productid
                        FROM
                            products p
                        WHERE
                            p.unit_type = 3
                        ))
                `, [jcResult.map((item: any) => item.id)]);

                const [dciResult]: any = await connection.query(`
                    SELECT 
                        jcm.job_card_id as jobCardId,
                        jcdd.card_dispatch_info_id as id,
                        jcdd.created_on as date,
                        dci.quantity,
                        dci.dispatch_unit_id as unitId,
                        dci.tare_value as core,
                        dci.total_value as net,
                        dci.net_weight as gross
                    FROM 
                        delivery_challan_items dci
                    JOIN job_card_dispatch_data jcdd 
                    ON
                        jcdd.card_dispatch_info_id = dci.card_dispatch_info_id
                    JOIN job_cards_master jcm 
                    ON
                        jcm.job_card_id = jcdd.job_card_id
                    WHERE
                        jcm.job_card_id in (?);
                    `, [jcResult.map((item: any) => item.id)]);
                return {
                    jobCards: jcResult,
                    machines: jpeResult,
                    dispatches: dciResult
                }
            } finally {
                connection.release();
            }
        });

        if (!result?.jobCards?.length) {
            throw new BusinessError(404, 'No job card(s) found');
        }

        result.jobCards.forEach((jobCard: any) => {
            const machines: any[] = [];
            result.machines.forEach((entry: any) => {
                if (entry.jobCardId == jobCard.id) {
                    const found = machines.find((r) => r.machineTypeId === entry.machineTypeId);
                    if (found) {
                        found.entries.push({ ...entry, jobCardId: undefined });
                    } else {
                        machines.push({
                            machineId: entry.machineId,
                            machineName: entry.machineName,
                            machineTypeId: entry.machineTypeId,
                            machineTypeName: entry.machineTypeName,
                            entries: [{ ...entry, jobCardId: undefined }],
                        });
                    }
                }
            });

            data.push({
                id: jobCard.id,
                jobCardNo: jobCard.jobCardNo,
                companyName: jobCard.companyName,
                productName: jobCard.productName,
                dispatches: result?.dispatches?.filter((dispatch: any) => dispatch.jobCardId == jobCard.id) || [],
                machines,
            });
        });

        return data;
    }

    public async getDispatchReport(filter: any): Promise<any> {
        if (!filter?.startDate) {
            throw new BusinessError(400, 'Start date is required');
        }

        if (!filter?.endDate) {
            throw new BusinessError(400, 'End date is required');
        }

        const whereClauses: string[] = [];
        const params: any[] = [];
        if (filter?.official) {
            whereClauses.push('jcdd.show_company_detail = ?');
            params.push(filter.official === 'true' ? 1 : 0);
        }

        const data = await withConnectionDatabase(async (connection) => {
            try {
                const [result]: any = await connection.query(`
                        SELECT
                            jcdd.created_on as dispatchDate,
                            jcm.created_on as jobCardDate,
                            jcdd.card_dispatch_no as dispatchNo,
                            jcm.job_card_no as jobCardNo,
                            jcdd.item_name as product,
                            CASE WHEN dci.dispatch_unit_id = 1 THEN dci.total_value ELSE 0 END as quantity,
                            CASE WHEN dci.dispatch_unit_id = 2 THEN dci.total_value ELSE 0 END as weight,
                            dci.total_value as total,
                            dci.dispatch_unit_id as unit
                        FROM
                            job_card_dispatch_data jcdd
                        JOIN delivery_challan_items dci ON
                            dci.card_dispatch_info_id = jcdd.card_dispatch_info_id
                        JOIN job_cards_master jcm ON
                            jcm.job_card_id = jcdd.job_card_id
                        WHERE 
                            jcdd.created_on BETWEEN ? AND ?
                            ${whereClauses.length ? 'AND ' + whereClauses.join(' AND ') : ''}
                        ORDER BY
                            jcdd.created_on ASC
                    `, [filter.startDate, filter.endDate, ...params]);

                return {
                    entries: result,
                    summary: result.reduce((acc: { totalQuantity: number; totalWeight: number }, entry: any) => {
                        if (entry.unit === 1) {
                            acc.totalQuantity += parseFloat(entry.total || 0);
                        } else {
                            acc.totalWeight += parseFloat(entry.total || 0);
                        }
                        return acc;
                    }, { totalQuantity: 0, totalWeight: 0 })
                };
            } finally {
                connection.release();
            }
        });

        return data;
    }

    // To be deprecated
    public async gerProductsListForJobCardBySearchTermService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {

            const searchQueryProduct = FormData?.searchQueryProduct;
            let searchParameters = '';

            if (FormData.productid > 0) {
                searchParameters += ` AND MTBL.productid = ${FormData.productid}`;
            }

            if (stringIsNullOrWhiteSpace(FormData.sku) == false) {
                searchParameters += ` AND MTBL.sku = '${FormData.sku}' `;
            }

            if (stringIsNullOrWhiteSpace(searchQueryProduct) == false) {
                searchParameters += ` AND ( MTBL.productid LIKE '%${searchQueryProduct}%' OR
                     MTBL.product_name LIKE '%${searchQueryProduct}%' OR
                     MTBL.SKU LIKE '%${searchQueryProduct}%' )`;
            }



            const offset = (FormData.pageNo - 1) * FormData.pageSize;
            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*
                FROM products MTBL
                WHERE MTBL.productid IS NOT NULL AND MTBL.is_active = 1
                ${searchParameters}
                ORDER BY MTBL.productid DESC
                LIMIT ${FormData.pageSize} OFFSET ${offset}
            `);

            const finalData: any = results;
            return finalData;
        });


    }

    public async createJobCardService(formData: IJobCardRequestForm): Promise<ServiceResponseInterface> {

        let responseJobCardInsert: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        const connection = await connectionPool.getConnection();

        try {
            // Begin the transaction
            await connection.beginTransaction();

            //--update case
            if (formData?.job_card_id && formData?.job_card_id > 0) {
                const tableName = 'job_cards_master';
                const primaryKeyName = 'job_card_id';
                const primaryKeyValue = formData?.job_card_id;

                const columnsJobCardFormUpdate: any = {
                    order_date: formData.order_date,
                    dispatch_date: formData.dispatch_date,
                    company_name: formData.company_name,
                    product_name: formData.product_name,
                    weight_qty: formData.weight_qty,
                    job_size: formData.job_size,

                    micron: formData.micron,
                    sealing_method: formData.sealing_method,
                    job_card_reference: formData.job_card_reference,
                    po_reference: formData.po_reference,
                    special_request: formData.special_request,

                    card_rate: formData.card_rate,
                    card_amount: formData.card_amount,


                    card_tax_type: formData.card_tax_type,
                    card_tax_value: formData.card_tax_value,
                    card_tax_amount: formData.card_tax_amount,

                    card_total_amount: formData.card_total_amount,

                    updated_on: new Date(),
                    updated_by: formData.createByUserId,
                };

                responseJobCardInsert = await dynamicDataUpdateServiceWithConnection(tableName, primaryKeyName, primaryKeyValue, columnsJobCardFormUpdate, connection);


                //-- insert/update into job card products
                if (formData.jobCardAllProducts && formData.jobCardAllProducts.length > 0) {
                    await connection.execute(`DELETE FROM job_card_products WHERE job_card_id = ?`, [formData.job_card_id]);
                    for (const element of formData.jobCardAllProducts) {
                        const columnsJobCardProducts: any = {
                            job_card_id: formData.job_card_id,
                            product_id: element.product_id,
                            product_code: element.product_code,

                        }
                        await dynamicDataInsertServiceNew('job_card_products', 'job_card_product_id',
                            null, true, columnsJobCardProducts, connection);
                    }
                } else {
                    await connection.execute(`DELETE FROM job_card_products WHERE job_card_id = ?`, [formData.job_card_id]);
                }

                //-- insert/update into 'job_card_dispatch_info'
                if (formData.job_card_dispatch_info && formData.job_card_dispatch_info.length > 0) {
                    await connection.execute(`DELETE FROM job_card_dispatch_info WHERE job_card_id = ?`, [formData.job_card_id]);
                    for (const element of formData.job_card_dispatch_info) {
                        const columnsJobCardDispatchInfoInsert: any = {
                            job_card_id: formData.job_card_id,
                            dispatch_place: element.dispatch_place,
                            dispatch_weight_quantity: element.dispatch_weight_quantity,

                        }
                        await dynamicDataInsertServiceNew('job_card_dispatch_info', 'job_card_dispatch_info_id',
                            null, true, columnsJobCardDispatchInfoInsert, connection);
                    }

                }
            } else {
                //--Insert into job_cards_master table
                let jobCardMasterTableMainData = {
                    tableName: 'job_cards_master',
                    primaryKeyName: 'job_card_id',
                    primaryKeyValue: null,
                    isAutoIncremented: true
                }

                const columnsJobCardForm: any = {
                    job_card_no: "",   //--formated auto number like : 'JC000001'
                    order_date: formData.order_date,
                    dispatch_date: formData.dispatch_date,
                    company_name: formData.company_name,
                    product_name: formData.product_name,
                    weight_qty: formData.weight_qty,
                    job_size: formData.job_size,

                    micron: formData.micron,
                    sealing_method: formData.sealing_method,
                    job_card_reference: formData.job_card_reference,
                    po_reference: formData.po_reference,
                    special_request: formData.special_request,

                    card_rate: formData.card_rate,
                    card_amount: formData.card_amount,


                    card_tax_type: formData.card_tax_type,
                    card_tax_value: formData.card_tax_value,
                    card_tax_amount: formData.card_tax_amount,

                    card_total_amount: formData.card_total_amount,

                    job_status: JobCardStatusEnum.InProgress,

                    created_on: new Date(),
                    created_by: formData.createByUserId,
                    official: formData.official,
                };

                responseJobCardInsert = await dynamicDataInsertServiceNew(jobCardMasterTableMainData.tableName, jobCardMasterTableMainData.primaryKeyName, jobCardMasterTableMainData.primaryKeyValue,
                    jobCardMasterTableMainData.isAutoIncremented, columnsJobCardForm, connection);
                if (responseJobCardInsert && responseJobCardInsert.success == true && responseJobCardInsert.primaryKeyValue) {

                    const job_card_id = responseJobCardInsert.primaryKeyValue;


                    //--inser into job_card_products table
                    let jobCardProductsTableData = {
                        tableName: 'job_card_products',
                        primaryKeyName: 'job_card_product_id',
                        primaryKeyValue: null,
                        isAutoIncremented: true
                    }

                    //-- insert into job card products
                    if (formData.jobCardAllProducts && formData.jobCardAllProducts.length > 0) {

                        for (const element of formData.jobCardAllProducts) {

                            const columnsJobCardProducts: any = {
                                job_card_id: job_card_id,
                                product_id: element.product_id,
                                product_code: element.product_code,

                            }
                            var responseOrderItem = await dynamicDataInsertServiceNew(jobCardProductsTableData.tableName, jobCardProductsTableData.primaryKeyName,
                                jobCardProductsTableData.primaryKeyValue, jobCardProductsTableData.isAutoIncremented, columnsJobCardProducts, connection);

                        }

                    }


                    //-- insert into 'job_card_dispatch_info'
                    if (formData.job_card_dispatch_info && formData.job_card_dispatch_info.length > 0) {

                        for (const element of formData.job_card_dispatch_info) {
                            const columnsJobCardDispatchInfo: any = {
                                job_card_id: job_card_id,
                                dispatch_place: element.dispatch_place,
                                dispatch_weight_quantity: element.dispatch_weight_quantity,
                                unique_key: element.unique_key,
                            }
                            var responseJobCardDispatchInfo = await dynamicDataInsertServiceNew('job_card_dispatch_info', 'dispatch_info_id',
                                null, true, columnsJobCardDispatchInfo, connection);

                        }

                    }

                    //--generate job card number
                    const jobCardNo = 'JC' + job_card_id?.toString().padStart(7, '0');

                    const extruderProduct = {
                        name: `JCP-${formData.produce_product_size}-${formData.produce_product_micron}`,
                        shortDescription: "Auto created for Job #" + jobCardNo,
                        sku: jobCardNo,
                        quantity: 0,
                        weight: 0,
                        weightUnitId: 1,
                        type: 3,
                        source: ProductSourceEnum.JobCard,
                        width: 0,
                        widthUnitId: 5,
                        length: 0,
                        lengthUnitId: 5,
                        micron: 0
                    }
                    const extruderProductResult: any = await this.inventoryService.createWithConnection(extruderProduct, { id: formData.createByUserId }, connection);

                    const columnsJobCardUpdate: any = {
                        job_card_no: jobCardNo,
                        extruder_product_id: extruderProductResult.id,
                    };
                    await dynamicDataUpdateServiceWithConnection('job_cards_master', 'job_card_id', job_card_id, columnsJobCardUpdate, connection);


                }
            }

            //--Commit the transaction if all inserts/updates are successful
            await connection.commit();


        } catch (error) {
            console.error('Error executing insert/update job card details:', error);

            //--Rollback the transaction on error
            await connection.rollback();

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

        return responseJobCardInsert;
    }

    public async getAllJobCardsListService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let searchParameters = '';


            if (stringIsNullOrWhiteSpace(FormData.job_card_no) == false) {
                searchParameters += ` AND MTBL.job_card_no LIKE '%${FormData.job_card_no}%' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.company_name) == false) {
                searchParameters += ` AND MTBL.company_name LIKE '%${FormData.company_name}%' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.product_name) == false) {
                searchParameters += ` AND MTBL.product_name LIKE '%${FormData.product_name}%' `;
            }



            const offset = (FormData.pageNo - 1) * FormData.pageSize;
            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*
                FROM job_cards_master MTBL
                WHERE MTBL.job_card_id IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.job_card_id DESC
                LIMIT ${FormData.pageSize} OFFSET ${offset}
            `);

            const finalData: any = results;
            return finalData;

        });


    }

    public async getJobCardDetailByIdForEditApiService(job_card_id: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let jobCardMain: any = {};


            const [resultsJobCardMaster]: any = await connection.query(`
                SELECT 
                MTBL.*
                FROM job_cards_master MTBL
                WHERE MTBL.job_card_id = ${job_card_id} `);


            if (resultsJobCardMaster && resultsJobCardMaster.length > 0) {
                jobCardMain = resultsJobCardMaster[0];

                //-- Get job card products
                const [resultJobCardProducts]: any = await connection.query(`
                    SELECT 
                    MTBL.*, prd.product_name as product_name, prd.sku
                    FROM job_card_products MTBL
                    inner join products prd on prd.productid =  MTBL.product_id
                    WHERE MTBL.job_card_id = ${jobCardMain.job_card_id} `);
                const job_card_products: any = resultJobCardProducts;
                jobCardMain.job_card_products = job_card_products;

                //--  Get job card dispatch info
                const [jobCardDispatchInfo]: any = await connection.query(`
                    SELECT 
                    MTBL.*
                    FROM job_card_dispatch_info MTBL
                    WHERE MTBL.job_card_id = ${jobCardMain.job_card_id} `);
                const job_card_dispatch_info: any = jobCardDispatchInfo;
                jobCardMain.job_card_dispatch_info = job_card_dispatch_info;

            }

            return jobCardMain;

        });


    }

    public async gerProductionEntryListBySearchTermService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {

            const searchQueryProductEntry = FormData?.searchQueryProductEntry;
            let searchParameters = '';


            if (stringIsNullOrWhiteSpace(searchQueryProductEntry) == false) {
                searchParameters += ` AND ( MTBL.job_card_id LIKE '%${searchQueryProductEntry}%' OR
                     MTBL.job_card_no LIKE '%${searchQueryProductEntry}%')`;
            }



            const offset = (FormData.pageNo - 1) * FormData.pageSize;
            const [results]: any = await connection.query(`
                SELECT
                MTBL.*
                FROM job_cards_master MTBL
                WHERE MTBL.job_card_id IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.job_card_id DESC
                LIMIT ${FormData.pageSize} OFFSET ${offset}
            `);

            const finalData: any = results;
            return finalData;
        });


    }

    public async insertUpdateProductionEntryService(formData: IJobProductionEntryForm): Promise<ServiceResponseInterface> {

        let response: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        const connection = await connectionPool.getConnection();

        try {

            // Begin the transaction
            await connection.beginTransaction();


            const tableName = 'job_production_entries';
            const primaryKeyName = 'production_entry_id';

            //-- get product id from job_card_products
            // const jobCardProduct =  await dynamicDataGetService('job_card_products', 'job_card_product_id', formData.job_card_product_id);

            const machineInfo = await this.getMachineInfoForProductionEntry(formData.machine_id);

            if (formData.production_entry_id != undefined && formData.production_entry_id != null && formData.production_entry_id > 0) {

                //-- get production entry detail by id before update
                const jobProductionEntryDetailBeforeUpdate = await dynamicDataGetServiceWithConnection('job_production_entries', 'production_entry_id', formData.production_entry_id, connection);
                const oldNetValue = parseFloat(jobProductionEntryDetailBeforeUpdate?.data?.net_value ?? '0') ?? 0;
                const oldWeightValue = parseFloat(jobProductionEntryDetailBeforeUpdate?.data?.weight_value ?? '0') ?? 0;


                const primaryKeyValue = formData.production_entry_id;

                const columns: any = {
                    machine_id: formData.machine_id,
                    job_card_product_id: formData.job_card_product_id,
                    waste_value: formData.waste_value,
                    net_value: formData.net_value,
                    gross_value: formData.gross_value,

                    weight_value: formData.weight_value,

                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    tare_core: formData.tare_core,

                    updated_on: new Date(),
                    updated_by: formData.createByUserId,

                };



                response = await dynamicDataUpdateServiceWithConnection(tableName, primaryKeyName, primaryKeyValue, columns, connection);

                if (response?.success == true) {

                    if (formData.job_card_product_id) {
                        //-- get product ledger info
                        // const formDataLedger = {productid: jobCardProduct?.data?.product_id}
                        // const productLedgerInfo = await this.getProductEntryLedgerInfo(formDataLedger);
                        let editNetValue = 0;
                        if (oldNetValue && oldNetValue != 0) {
                            editNetValue = oldNetValue - parseFloat(formData?.gross_value?.toString() ?? '0'); //-- old_value - new_value
                        }

                        let editWeightValue = 0;
                        if (oldWeightValue && oldWeightValue != 0) {
                            editWeightValue = oldWeightValue - parseFloat(formData?.weight_value ?? '0'); //-- old_value - new_value
                        }


                        const columnsLedger: any = {
                            productid: formData.job_card_product_id,
                            foreign_key_table_name: 'job_production_entries',
                            foreign_key_name: 'production_entry_id',
                            foreign_key_value: formData.production_entry_id,
                            weight_quantity_value: oldNetValue,
                            quantity: editWeightValue,
                            action_type: ProductionEntriesTypesEnum.NewProductionEntry,

                            created_at: new Date(),
                        };

                        const responseLedger = await dynamicDataInsertServiceNew('inventory_ledger', 'ledger_id', null, true, columnsLedger, connection);
                        if (responseLedger?.success == true) {

                            //-- update product stock quantity
                            const ledger = await getWeightAndQtyFromLedger(formData.job_card_product_id, connection)
                            const columnsProducts: any = {
                                stockquantity: ledger.total_quantity,
                                weight_value: ledger.total_weight_quantity,

                                updated_on: new Date(),
                                updated_by: formData.createByUserId,

                            };
                            var responseOrderMain = await dynamicDataUpdateServiceWithConnection('products', 'productid', formData.job_card_product_id, columnsProducts, connection);
                        }

                    }

                    //-- update status of job card from machine type
                    if (machineInfo && !stringIsNullOrWhiteSpace(machineInfo.machine_type_name)) {
                        const columnsJobCardMaster: any = {
                            job_status: machineInfo.machine_type_name,
                            updated_on: new Date(),
                            updated_by: formData.createByUserId,
                        };
                        var responseJobCardMaster = await dynamicDataUpdateServiceWithConnection('job_cards_master', "job_card_id", formData?.job_card_id?.toString() ?? "0", columnsJobCardMaster, connection);

                    }


                }


            } else {



                const columns: any = {
                    //production_entry_id: formData.production_entry_id,
                    job_card_id: formData.job_card_id,
                    machine_id: formData.machine_id,
                    job_card_product_id: formData.job_card_product_id,
                    waste_value: formData.waste_value,
                    net_value: formData.net_value,
                    gross_value: formData.gross_value,

                    weight_value: formData.weight_value,

                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    tare_core: formData.tare_core,


                    created_on: new Date(),
                    created_by: formData.createByUserId,


                };


                response = await dynamicDataInsertServiceNew(tableName, primaryKeyName, null, true, columns, connection);
                if (response?.success == true) {

                    if (formData.job_card_product_id) {

                        const columnsLedger: any = {
                            productid: formData.job_card_product_id,
                            foreign_key_table_name: 'job_production_entries',
                            foreign_key_name: 'production_entry_id',
                            foreign_key_value: response?.primaryKeyValue,

                            quantity: -parseInt(formData.weight_value ?? '0'),
                            weight_quantity_value: -parseInt(formData.gross_value?.toString() ?? '0'),

                            action_type: ProductionEntriesTypesEnum.NewProductionEntry,

                            created_at: new Date(),
                        };

                        const responseLedger = await dynamicDataInsertServiceNew('inventory_ledger', 'ledger_id', null, true, columnsLedger, connection);
                        if (responseLedger?.success == true) {

                            //-- update product stock quantity
                            const ledger = await getWeightAndQtyFromLedger(formData.job_card_product_id, connection)
                            const columnsProducts: any = {
                                stockquantity: ledger.total_quantity,
                                weight_value: ledger.total_weight_quantity,
                                updated_on: new Date(),
                                updated_by: formData.createByUserId,

                            };
                            var responseOrderMain = await dynamicDataUpdateServiceWithConnection('products', 'productid', formData.job_card_product_id, columnsProducts, connection);
                        }

                    }

                    //-- update status of job card from machine type
                    if (machineInfo && !stringIsNullOrWhiteSpace(machineInfo.machine_type_name)) {
                        const columnsJobCardMaster: any = {
                            job_status: machineInfo.machine_type_name,
                            updated_on: new Date(),
                            updated_by: formData.createByUserId,
                        };
                        var responseJobCardMaster = await dynamicDataUpdateServiceWithConnection('job_cards_master', "job_card_id", formData?.job_card_id?.toString() ?? "0", columnsJobCardMaster, connection);

                    }


                }




            }


            //--Commit the transaction if all inserts/updates are successful
            await connection.commit();


        } catch (error) {
            console.error('Error executing insert/update proudct details:', error);

            //--Rollback the transaction on error
            await connection.rollback();



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

        return response;
    }

    public async getAllJobProductionEntriesApi(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let searchParameters = '';


            if (stringIsNullOrWhiteSpace(FormData.production_entry_id) == false) {
                searchParameters += ` AND mtbl.production_entry_id LIKE '%${FormData.production_entry_id}%' `;
            }
            if (stringIsNullOrWhiteSpace(FormData.job_card_id) == false) {
                searchParameters += ` AND JMSTR.job_card_id LIKE '%${FormData.job_card_id}%' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.machine_name) == false) {
                searchParameters += ` AND mtc.machine_name LIKE '%${FormData.machine_name}%' `;
            }



            const offset = (FormData.pageNo - 1) * FormData.pageSize;
            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                mtbl.*, prdc.product_name, prdc.sku, mtc.machine_name, JMSTR.job_card_no, JMSTR.company_name, JMSTR.product_name, JMSTR.weight_qty
                FROM job_production_entries mtbl
                LEFT join job_card_products JBCRD on JBCRD.job_card_product_id =  mtbl.job_card_product_id
                inner join job_cards_master JMSTR on JMSTR.job_card_id =  mtbl.job_card_id
                LEFT join products  prdc on JBCRD.product_id =  prdc.productid
                inner join machines  mtc on mtbl.machine_id =  mtc.machine_id
                WHERE mtbl.production_entry_id IS NOT NULL
                ${searchParameters}
                ORDER BY mtbl.production_entry_id DESC
                LIMIT ${FormData.pageSize} OFFSET ${offset}
            `);

            const finalData: any = results;
            return finalData;

        });


    }

    public async getProductEntryLedgerInfo(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {


            const [results]: any = await connection.query(`
                SELECT 
                MTBL.* 
                FROM inventory_ledger MTBL
                
                WHERE MTBL.productid = ${FormData?.productid} AND MTBL.foreign_key_table_name = 'job_production_entries' 
                `);

            if (results && results.length > 0) {
                return results[0];
            } else {
                return null;
            }


        });


    }

    public async insertCardDispatchInfoService(formData: IJobCardDispatchInfoForm): Promise<ServiceResponseInterface> {

        let response: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        const connection = await connectionPool.getConnection();

        try {

            // Begin the transaction
            await connection.beginTransaction();


            const tableName = 'job_card_dispatch_data';
            const primaryKeyName = 'card_dispatch_info_id';


            const grand_total = formData?.deliveryChallanLineItems?.reduce((total: number, item: { total_value: number; }) => total + item.total_value, 0)
            const columns: any = {
                job_card_id: formData.job_card_id,
                company_name: formData.company_name,
                item_name: formData.item_name,
                show_company_detail: formData.show_company_detail,
                grand_total: grand_total,
                po_number: formData.po_number,
                tr_number: formData.tr_number,
                created_on: new Date(),
                created_by: formData.createByUserId,

            };


            response = await dynamicDataInsertServiceNew(tableName, primaryKeyName, null, true, columns, connection);
            if (response?.success == true) {
                const card_dispatch_info_id: any = response?.primaryKeyValue;
                let card_dispatch_no = 'DN';;
                if (formData.show_company_detail == true) {
                    const [taxChallanResult]: any = await connection.query(`SELECT COUNT(show_company_detail) as count FROM job_card_dispatch_data WHERE show_company_detail = 1`);
                    const nextNumber = parseInt(taxChallanResult[0].count ?? 0, 10) + 3;
                    card_dispatch_no = 'CH' + nextNumber.toString().padStart(7, '0');
                } else {
                    const [nonTaxChallanResult]: any = await connection.query(`SELECT COUNT(show_company_detail) as count FROM job_card_dispatch_data WHERE show_company_detail = 0`);
                    const nextNumber = parseInt(nonTaxChallanResult[0].count ?? 0, 10) + 97; // because old logic was based on PK
                    card_dispatch_no = 'DN' + nextNumber.toString().padStart(7, '0');
                }

                const columnsDispatchUpdate: any = {
                    card_dispatch_no: card_dispatch_no,
                };
                var responseCardDispatch = await dynamicDataUpdateServiceWithConnection('job_card_dispatch_data', 'card_dispatch_info_id', card_dispatch_info_id, columnsDispatchUpdate, connection);


                if (formData.deliveryChallanLineItems && formData.deliveryChallanLineItems.length > 0) {

                    for (const element of formData.deliveryChallanLineItems) {

                        const columnsChallanItem: any = {
                            card_dispatch_info_id: card_dispatch_info_id,

                            total_bags: element.total_bags,

                            bagRollType: element.bagRollType,

                            quantity: element.quantity,
                            dispatch_unit_id: element.dispatch_unit_id,
                            net_weight: element.net_weight,
                            tare_value: element.tare_value,
                            total_value: element.total_value,


                        }
                        var responseOrderItem = await dynamicDataInsertServiceNew("delivery_challan_items", "challan_item_id",
                            null, true, columnsChallanItem, connection);


                    }

                }

            }

            const jobCardMasterTableValue = {
                job_status: 'Dispatched',
            }
            await DynamicCud.update('job_cards_master', formData.job_card_id, 'job_card_id', jobCardMasterTableValue, connection);

            //--Commit the transaction if all inserts/updates are successful
            await connection.commit();


        } catch (error) {
            console.error('Error executing insert/update proudct details:', error);

            //--Rollback the transaction on error
            await connection.rollback();

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

        return response;
    }

    public async getJobDispatchReportDataService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let searchParameters = '';


            if (stringIsNullOrWhiteSpace(FormData.job_card_id) == false) {
                searchParameters += ` AND mtbl.job_card_id = '${FormData.job_card_id}' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.fromDate) == false) {
                searchParameters += ` AND mtbl.created_on >= '${FormData.fromDate}' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.toDate) == false) {
                searchParameters += ` AND mtbl.created_on <= '${FormData.toDate}' `;
            }



            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                mtbl.*, JMSTR.job_card_no, JMSTR.created_on as job_date
                FROM job_card_dispatch_data mtbl
                inner join job_cards_master JMSTR on JMSTR.job_card_id =  mtbl.job_card_id
              
                WHERE mtbl.job_card_id IS NOT NULL
                ${searchParameters}
                
                
            `);

            const finalData: any = results;
            return finalData;

        });


    }

    public async getJobDispatchReportDataByIdService(card_dispatch_info_id: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {

            const [resultJobCardDispatchData]: any = await connection.query(`
                SELECT 
                mtbl.*, JMSTR.job_card_no, JMSTR.created_on as job_date
                FROM job_card_dispatch_data mtbl
                inner join job_cards_master JMSTR on JMSTR.job_card_id =  mtbl.job_card_id
                 WHERE mtbl.card_dispatch_info_id = ${card_dispatch_info_id}
                `);


            if (resultJobCardDispatchData && resultJobCardDispatchData.length > 0) {
                const result = resultJobCardDispatchData[0];
                const [resultChallanItems]: any = await connection.query(`
                    SELECT 
                    mtbl.*
                    FROM delivery_challan_items mtbl
                    WHERE mtbl.card_dispatch_info_id = ${card_dispatch_info_id}
                    `);

                result.deliveryChallanLineItems = resultChallanItems;

                return result;
            } else {
                return null;
            }

        });


    }

    public async getMachineBaseReportService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {
            let searchParameters = '';


            if (stringIsNullOrWhiteSpace(FormData.machineTypeId) == false && FormData.machineTypeId > 0) {
                searchParameters += ` AND MCT.machine_type_id = '${FormData.machineTypeId}' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.fromDate) == false) {
                searchParameters += ` AND MTBL.created_on >= '${FormData.fromDate}' `;
            }

            if (stringIsNullOrWhiteSpace(FormData.toDate) == false) {
                searchParameters += ` AND MTBL.created_on <= '${FormData.toDate}' `;
            }

            if (!stringIsNullOrWhiteSpace(FormData.commaSeparatedMachineIds)) {
                searchParameters += ` AND MSN.machine_id IN (${FormData.commaSeparatedMachineIds}) `;
            }



            const [results]: any = await connection.query(`
                SELECT MTBL.production_entry_id, MTBL.job_card_id, MTBL.machine_id, MTBL.job_card_product_id, MTBL.waste_value, MTBL.net_value, 
                MTBL.gross_value, MTBL.tare_core, MTBL.created_on AS prod_entry_date, PRD.product_name as item_name, JCM.job_card_no, MCT.machine_type_name,
                JCM.job_size , MSN.machine_name
                FROM job_production_entries MTBL
                LEFT JOIN products PRD ON PRD.productid = MTBL.job_card_product_id
                INNER JOIN job_cards_master JCM on JCM.job_card_id = MTBL.job_card_id
                LEFT JOIN machines MSN ON MTBL.machine_id = MSN.machine_id

                INNER JOIN machine_types MCT on MCT.machine_type_id = MSN.machine_type_id
              
                WHERE MTBL.production_entry_id IS NOT NULL
                ${searchParameters}
                
                
            `);

            const finalData: any = results;
            return finalData;

        });


    }

    public async getMachineInfoForProductionEntry(machine_id: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {

            const [resultMachineType]: any = await connection.query(`
                SELECT 
                mtbl.*,  MTYPE.machine_type_name
                FROM machines mtbl
                inner join machine_types MTYPE on MTYPE.machine_type_id =  mtbl.machine_type_id
                 WHERE mtbl.machine_id = ${machine_id}
                `);


            if (resultMachineType && resultMachineType.length > 0) {
                return resultMachineType[0];
            } else {
                return null;
            }

        });


    }

    public async getAllProductsForProductionEntryService(FormData: any): Promise<any> {

        return withConnectionDatabase(async (connection: any) => {



            const offset = (FormData.pageNo - 1) * FormData.pageSize;
            const [results]: any = await connection.query(`
                SELECT
                MTBL.*
                FROM products MTBL
                WHERE MTBL.is_active = 1
                ORDER BY MTBL.productid DESC
                LIMIT ${FormData.pageSize} OFFSET ${offset}
            `);

            const finalData: any = results;
            return finalData;

        });


    }

    public async getDispatchForAutoComplete(value: string): Promise<any> {
        return withConnectionDatabase(async (connection: any) => {
            const [results]: any = await connection.query(`
                SELECT
                    d.card_dispatch_info_id as dispatchId,
                    d.card_dispatch_no as dispatchNo,
                    d.item_name as itemName,
                    d.grand_total as quantity,
                    d.company_name as companyName,
                    jc.job_card_id as jobCardId,
                    jc.card_rate as rate,
                    dci.dispatch_unit_id as unitId,
                    jc.official as official
                FROM job_card_dispatch_data d
                INNER JOIN job_cards_master jc
                    ON d.job_card_id = jc.job_card_id
                LEFT JOIN delivery_challan_items dci
                    ON dci.card_dispatch_info_id = d.card_dispatch_info_id
                WHERE d.card_dispatch_no like '%${value}%'
                LIMIT 10;
            `);

            const finalData: any = results;
            return finalData;
        });
    }
}
