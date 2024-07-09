import { Pool } from 'mysql2/promise';
import { withConnectionDatabase } from '../configurations/db';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { IJobCardRequestForm } from '../models/jobCardManagement/IJobCardRequestForm';
import { dynamicDataInsertService, dynamicDataUpdateService } from './dynamic.service';



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
                FROM PRODUCTS MTBL
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
                materials: formData.materials,
                micron: formData.micron,
                sealing_method: formData.sealing_method,
                job_card_reference: formData.job_card_reference,
                special_request: formData.special_request,
                dispatch_place: formData.dispatch_place,
                distribution: formData.distribution,
                card_rate: formData.card_rate,
                card_amount: formData.card_amount,

              
                card_tax_type: formData.card_tax_type,
                card_tax_value: formData.card_tax_value,
                card_tax_amount: formData.card_tax_amount,

                card_total_amount: formData.card_total_amount,

                created_on: new Date(),
                created_by: formData.createByUserId,
            };
            
            console.log(columnsJobCardForm);
            

            responseJobCardInsert = await dynamicDataInsertService(jobCardMasterTableMainData.tableName, jobCardMasterTableMainData.primaryKeyName, jobCardMasterTableMainData.primaryKeyValue,
                jobCardMasterTableMainData.isAutoIncremented, columnsJobCardForm);
            if (responseJobCardInsert && responseJobCardInsert.success == true && responseJobCardInsert.primaryKeyValue) {

                const job_card_id = responseJobCardInsert.primaryKeyValue;


                //--inser into job_card_products table
                let purchaseOrderItemsTableMainData = {
                    tableName: 'job_card_products',
                    primaryKeyName: 'job_card_product_id',
                    primaryKeyValue: null,
                    isAutoIncremented: true
                }

                if (formData.jobCardAllProducts && formData.jobCardAllProducts.length > 0) {

                    for (const element of formData.jobCardAllProducts) {

                    
                            const columnsJobCardProducts: any = {
                                job_card_id: job_card_id,
                                product_id: element.product_id,

                                product_code: element.product_code,
                                quantity: element.quantity,
                              
                            }
                            var responseOrderItem = await dynamicDataInsertService(purchaseOrderItemsTableMainData.tableName, purchaseOrderItemsTableMainData.primaryKeyName,
                                purchaseOrderItemsTableMainData.primaryKeyValue, purchaseOrderItemsTableMainData.isAutoIncremented, columnsJobCardProducts);

                        }

                }

                //--update job_cards_master table "job_card_no" column
                const jobCardNo = 'JC' + job_card_id?.toString().padStart(7, '0');
                const columnsJobCardUpdate: any = {
                    job_card_no: jobCardNo,
                    updated_on: new Date(),
                    updated_by: formData.createByUserId,

                };
                var responseOrderMain = await dynamicDataUpdateService('job_cards_master', 'job_card_id', job_card_id, columnsJobCardUpdate);


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

            if (stringIsNullOrWhiteSpace(FormData.sealing_method) == false) {
                searchParameters += ` AND MTBL.sealing_method LIKE '%${FormData.sealing_method}%' `;
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


}

export default JobCardService;
