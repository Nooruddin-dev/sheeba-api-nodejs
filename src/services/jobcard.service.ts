import { Pool } from 'mysql2/promise';
import { withConnectionDatabase } from '../configurations/db';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { IJobCardRequestForm } from '../models/jobCardManagement/IJobCardRequestForm';
import { dynamicDataGetByAnyColumnService, dynamicDataGetService, dynamicDataInsertService, dynamicDataUpdateService } from './dynamic.service';
import { JobCardStatusEnum } from '../models/jobCardManagement/IJobCardStatus';
import { IJobProductionEntryForm } from '../models/jobCardManagement/IJobProductionEntryForm';
import { ProductionEntriesTypesEnum } from '../models/enum/GlobalEnums';
import { getProductQuantityFromLedger, getProductWeightValueFromLedger } from './common.service';
import { IJobCardDispatchInfoForm } from '../models/jobCardManagement/IJobCardDispatchInfoForm';



class JobCardService {

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



            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*
                FROM products MTBL
                WHERE MTBL.productid IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.productid DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
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

        try {


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

                responseJobCardInsert = await dynamicDataUpdateService(tableName, primaryKeyName, primaryKeyValue, columnsJobCardFormUpdate);


                //-- insert/update into job card products
                if (formData.jobCardAllProducts && formData.jobCardAllProducts.length > 0) {

                    for (const element of formData.jobCardAllProducts) {

                        //--get job_card_products by id
                        const job_product_data = await dynamicDataGetService('job_card_products', 'job_card_product_id', element.job_card_product_id);
                        if (job_product_data?.data && job_product_data?.data != null) {
                            const jobCardProductRow = job_product_data?.data;

                            const columnsJobCardProductsUpdate: any = {
                                product_id: element.product_id,
                                product_code: element.product_code,
                            }

                            const responseProductInfo = await dynamicDataUpdateService('job_card_products', 'job_card_product_id', jobCardProductRow.job_card_product_id, columnsJobCardProductsUpdate);

                        } else {
                            const columnsJobCardProducts: any = {
                                job_card_id: formData.job_card_id,
                                product_id: element.product_id,
                                product_code: element.product_code,

                            }
                            var responseOrderItem = await dynamicDataInsertService('job_card_products', 'job_card_product_id',
                                null, true, columnsJobCardProducts);

                        }


                    }

                }

                //-- insert/update into 'job_card_dispatch_info'
                if (formData.job_card_dispatch_info && formData.job_card_dispatch_info.length > 0) {

                    for (const element of formData.job_card_dispatch_info) {

                        //--get job_card_products by id
                        const job_dispatch_data = await dynamicDataGetService('job_card_dispatch_info', 'dispatch_info_id', element.dispatch_info_id);
                        if (job_dispatch_data?.data && job_dispatch_data?.data != null) {
                            const jobDispatchRow = job_dispatch_data?.data;

                            const columnsJobCardDispatchInfoUpdate: any = {
                                dispatch_place: element.dispatch_place,
                                dispatch_weight_quantity: element.dispatch_weight_quantity,
                            }

                            const responseDispatchInfo = await dynamicDataUpdateService('job_card_dispatch_info', 'dispatch_info_id', jobDispatchRow.dispatch_info_id, columnsJobCardDispatchInfoUpdate);

                        } else {
                            const columnsJobCardDispatchInfoInsert: any = {
                                job_card_id: formData.job_card_id,
                                dispatch_place: element.dispatch_place,
                                dispatch_weight_quantity: element.dispatch_weight_quantity,

                            }
                            const responseDispatchInfo = await dynamicDataInsertService('job_card_dispatch_info', 'job_card_dispatch_info_idproduct_id',
                                null, true, columnsJobCardDispatchInfoInsert);

                        }


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
                };




                responseJobCardInsert = await dynamicDataInsertService(jobCardMasterTableMainData.tableName, jobCardMasterTableMainData.primaryKeyName, jobCardMasterTableMainData.primaryKeyValue,
                    jobCardMasterTableMainData.isAutoIncremented, columnsJobCardForm);
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
                            var responseOrderItem = await dynamicDataInsertService(jobCardProductsTableData.tableName, jobCardProductsTableData.primaryKeyName,
                                jobCardProductsTableData.primaryKeyValue, jobCardProductsTableData.isAutoIncremented, columnsJobCardProducts);

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
                            var responseJobCardDispatchInfo = await dynamicDataInsertService('job_card_dispatch_info', 'dispatch_info_id',
                                null, true, columnsJobCardDispatchInfo);

                        }

                    }






                    //--update job_cards_master table "job_card_no" column
                    const jobCardNo = 'JC' + job_card_id?.toString().padStart(7, '0');
                    const columnsJobCardUpdate: any = {
                        job_card_no: jobCardNo,
                        // updated_on: new Date(),
                        // updated_by: formData.createByUserId,

                    };
                    var responseOrderMain = await dynamicDataUpdateService('job_cards_master', 'job_card_id', job_card_id, columnsJobCardUpdate);


                }
            }


        } catch (error) {
            console.error('Error executing insert/update job card details:', error);
            throw error;
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



            const [results]: any = await connection.query(`
                SELECT COUNT(*) OVER () as TotalRecords, 
                MTBL.*
                FROM job_cards_master MTBL
                WHERE MTBL.job_card_id IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.job_card_id DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
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



            const [results]: any = await connection.query(`
                SELECT
                MTBL.*
                FROM job_cards_master MTBL
                WHERE MTBL.job_card_id IS NOT NULL
                ${searchParameters}
                ORDER BY MTBL.job_card_id DESC
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
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

        try {




            const tableName = 'job_production_entries';
            const primaryKeyName = 'production_entry_id';

            //-- get product id from job_card_products
            const jobCardProduct = await dynamicDataGetService('job_card_products', 'job_card_product_id', formData.job_card_product_id);

            const machineInfo = await this.getMachineInfoForProductionEntry(formData.machine_id);

            if (formData.production_entry_id != undefined && formData.production_entry_id != null && formData.production_entry_id > 0) {

                //-- get production entry detail by id before update
                const jobProductionEntryDetailBeforeUpdate = await dynamicDataGetService('job_production_entries', 'production_entry_id', formData.production_entry_id);
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



                response = await dynamicDataUpdateService(tableName, primaryKeyName, primaryKeyValue, columns);

                if (response?.success == true) {

                    if (jobCardProduct?.data?.product_id > 0) {
                        //-- get product ledger info
                        // const formDataLedger = {productid: jobCardProduct?.data?.product_id}
                        // const productLedgerInfo = await this.getProductEntryLedgerInfo(formDataLedger);
                        let editNetValue = 0;
                        if (oldNetValue && oldNetValue != 0) {
                            editNetValue = oldNetValue - parseFloat(formData?.net_value?.toString() ?? '0'); //-- old_value - new_value
                        }

                        let editWeightValue = 0;
                        if (oldWeightValue && oldWeightValue != 0) {
                            editWeightValue = oldWeightValue - parseFloat(formData?.weight_value ?? '0'); //-- old_value - new_value
                        }


                        const columnsLedger: any = {
                            productid: jobCardProduct?.data?.product_id,
                            foreign_key_table_name: 'job_production_entries',
                            foreign_key_name: 'production_entry_id',
                            foreign_key_value: formData.production_entry_id,
                            weight_quantity_value: oldNetValue,
                            quantity: editWeightValue,
                            action_type: ProductionEntriesTypesEnum.NewProductionEntry,

                            created_at: new Date(),
                        };

                        const responseLedger = await dynamicDataInsertService('inventory_ledger', 'ledger_id', null, true, columnsLedger);
                        if (responseLedger?.success == true) {

                            //-- update product stock quantity
                            const ledgerStockQuantity = await getProductQuantityFromLedger(jobCardProduct?.data?.product_id);
                            const ledgerWeightResult = await getProductWeightValueFromLedger(jobCardProduct?.data?.product_id);

                            if (ledgerStockQuantity && ledgerStockQuantity.total_quantity > 0) {
                                const columnsProducts: any = {
                                    stockquantity: ledgerStockQuantity.total_quantity,
                                    weight_value: ledgerWeightResult.total_weight_quantity,

                                    updated_on: new Date(),
                                    updated_by: formData.createByUserId,

                                };
                                var responseOrderMain = await dynamicDataUpdateService('products', 'productid', jobCardProduct?.data?.product_id, columnsProducts);
                            }

                        }

                    }

                    //-- update status of job card from machine type
                    if (machineInfo && !stringIsNullOrWhiteSpace(machineInfo.machine_type_name)) {
                        const columnsJobCardMaster: any = {
                            job_status: machineInfo.machine_type_name,
                            updated_on: new Date(),
                            updated_by: formData.createByUserId,
                        };
                        var responseJobCardMaster = await dynamicDataUpdateService('job_cards_master', "job_card_id", formData?.job_card_id?.toString() ?? "0", columnsJobCardMaster);

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


                response = await dynamicDataInsertService(tableName, primaryKeyName, null, true, columns);
                if (response?.success == true) {

                    if (jobCardProduct?.data?.product_id > 0) {

                        const columnsLedger: any = {
                            productid: jobCardProduct?.data?.product_id,
                            foreign_key_table_name: 'job_production_entries',
                            foreign_key_name: 'production_entry_id',
                            foreign_key_value: response?.primaryKeyValue,

                            quantity: -parseInt(formData.weight_value ?? '0'),
                            weight_quantity_value: -parseInt(formData.net_value?.toString() ?? '0'),

                            action_type: ProductionEntriesTypesEnum.NewProductionEntry,

                            created_at: new Date(),
                        };

                        const responseLedger = await dynamicDataInsertService('inventory_ledger', 'ledger_id', null, true, columnsLedger);
                        if (responseLedger?.success == true) {

                            //-- update product stock quantity
                            const ledgerStockQuantity = await getProductQuantityFromLedger(jobCardProduct?.data?.product_id);
                            const ledgerWeightResult = await getProductWeightValueFromLedger(jobCardProduct?.data?.product_id);

                            if (ledgerStockQuantity && ledgerStockQuantity.total_quantity > 0) {
                                const columnsProducts: any = {
                                    stockquantity: ledgerStockQuantity.total_quantity,
                                    weight_value: ledgerWeightResult.total_weight_quantity,
                                    updated_on: new Date(),
                                    updated_by: formData.createByUserId,

                                };
                                var responseOrderMain = await dynamicDataUpdateService('products', 'productid', jobCardProduct?.data?.product_id, columnsProducts);
                            }

                        }

                    }

                    //-- update status of job card from machine type
                    if (machineInfo && !stringIsNullOrWhiteSpace(machineInfo.machine_type_name)) {
                        const columnsJobCardMaster: any = {
                            job_status: machineInfo.machine_type_name,
                            updated_on: new Date(),
                            updated_by: formData.createByUserId,
                        };
                        var responseJobCardMaster = await dynamicDataUpdateService('job_cards_master', "job_card_id", formData?.job_card_id?.toString() ?? "0", columnsJobCardMaster);

                    }


                }




            }


        } catch (error) {
            console.error('Error executing insert/update proudct details:', error);
            throw error;
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
                LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
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

        try {




            const tableName = 'job_card_dispatch_data';
            const primaryKeyName = 'card_dispatch_info_id';


            const grand_total = formData?.deliveryChallanLineItems?.reduce((total: number, item: { total_value: number; }) => total + item.total_value, 0)
            const columns: any = {
                job_card_id: formData.job_card_id,
                company_name: formData.company_name,
                item_name: formData.item_name,
                show_company_detail: formData.show_company_detail,
                grand_total: grand_total,

                created_on: new Date(),
                created_by: formData.createByUserId,

            };


            response = await dynamicDataInsertService(tableName, primaryKeyName, null, true, columns);
            if (response?.success == true) {
                const card_dispatch_info_id: any = response?.primaryKeyValue;
                const card_dispatch_no = 'DN' + response?.primaryKeyValue?.toString().padStart(7, '0');
                const columnsDispatchUpdate: any = {
                    card_dispatch_no: card_dispatch_no,
                };
                var responseCardDispatch = await dynamicDataUpdateService('job_card_dispatch_data', 'card_dispatch_info_id', card_dispatch_info_id, columnsDispatchUpdate);


                if (formData.deliveryChallanLineItems && formData.deliveryChallanLineItems.length > 0) {

                    for (const element of formData.deliveryChallanLineItems) {

                        const columnsChallanItem: any = {
                            card_dispatch_info_id: card_dispatch_info_id,

                            total_bags: element.total_bags,
                            quantity: element.quantity,
                            dispatch_unit_id: element.dispatch_unit_id,
                            net_weight: element.net_weight,
                            tare_value: element.tare_value,
                            total_value: element.total_value,


                        }
                        var responseOrderItem = await dynamicDataInsertService("delivery_challan_items", "challan_item_id",
                            null, true, columnsChallanItem);


                    }

                }

            }



        } catch (error) {
            console.error('Error executing insert/update proudct details:', error);
            throw error;
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
                MTBL.gross_value, MTBL.created_on AS prod_entry_date, PRD.product_name as item_name, JCM.job_card_no, MCT.machine_type_name,
                JCM.job_size
                FROM job_production_entries MTBL
                LEFT JOIN job_card_products JCP ON JCP.job_card_id = MTBL.job_card_id
                LEFT JOIN products PRD ON PRD.productid = JCP.product_id
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



}

export default JobCardService;
