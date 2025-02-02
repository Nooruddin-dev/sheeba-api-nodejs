import { Request, Response } from 'express';
import { getBusnPartnerIdFromApiHeader } from '../utils/authHelpers/AuthMainHelper';
import MachinesService from '../services/machines.services';
import JobCardService from '../services/jobcard.service';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { IJobCardRequestForm } from '../models/jobCardManagement/IJobCardRequestForm';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { IJobProductionEntryForm } from '../models/jobCardManagement/IJobProductionEntryForm';
import { IJobCardDispatchInfoForm } from '../models/jobCardManagement/IJobCardDispatchInfoForm';
import { HandleError } from '../configurations/error';

export default class JobCardController {
    constructor() {
        this.jobCardService = new JobCardService();
    }

    private readonly jobCardService: JobCardService;

    public autoComplete = async (req: Request, res: Response): Promise<void> => {
        try {
            const { value } = req.query;
            const result = await this.jobCardService.autoComplete(value);
            res.status(200).json(result);
        } catch (error) {
            HandleError(res, error)
        }
    }

    // To be deprecated
    public gerProductsListForJobCardBySearchTermApi = async (req: Request, res: Response): Promise<void> => {



        const searchQueryProduct = req.params.searchQueryProduct
        if (stringIsNullOrWhiteSpace(searchQueryProduct) == true) {
            res.status(404).json({ message: 'Please provide a search term' });
        }



        try {

            const formData = {
                pageNo: 1,
                pageSize: 50,
                searchQueryProduct: searchQueryProduct || '',

            };



            const result = await this.jobCardService.gerProductsListForJobCardBySearchTermService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public createJobCardApi = async (req: Request, res: Response) => {
        try {



            const model: IJobCardRequestForm = req.body;

            const responseBody: ServiceResponseInterface = {
                success: false,
                responseMessage: '',
                primaryKeyValue: null
            };



            if (stringIsNullOrWhiteSpace(model.order_date) || stringIsNullOrWhiteSpace(model.dispatch_date)
                || stringIsNullOrWhiteSpace(model.company_name) || stringIsNullOrWhiteSpace(model.product_name) || stringIsNullOrWhiteSpace(model.weight_qty)
                || stringIsNullOrWhiteSpace(model.job_size) || stringIsNullOrWhiteSpace(model.sealing_method) || stringIsNullOrWhiteSpace(model.card_rate)) {
                responseBody.responseMessage = 'Please fill all required fields';
                res.status(200).json({ Response: responseBody });
                return;
            }



            if (model.jobCardAllProducts == undefined || model.jobCardAllProducts == null || model.jobCardAllProducts?.length < 1) {
                responseBody.responseMessage = 'Please select at least one product!';
                res.status(200).json({ Response: responseBody });
                return;
            }





            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);
            model.createByUserId = busnPartnerIdHeader;



            const response = await this.jobCardService.createJobCardService(model);


            res.status(200).json({ Response: response });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error processing request', error });
        }
    }

    public getAllJobCardsListApi = async (req: Request, res: Response): Promise<void> => {

        const { job_card_no, company_name, product_name, pageNo = 1, pageSize = 10 } = req.query;

        try {
            //const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 10,
                job_card_no: job_card_no ? job_card_no : "",
                company_name: company_name || '',
                product_name: product_name || '',
            };

            console.log('formData', formData);

            const result = await this.jobCardService.getAllJobCardsListService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public getJobCardDetailByIdForEditApi = async (req: Request, res: Response): Promise<void> => {

        const job_card_id_param = req.params.job_card_id;
        if (stringIsNullOrWhiteSpace(job_card_id_param) == true) {
            res.status(404).json({ message: 'Please provide a purchase order id' });
        }

        let job_card_id = parseInt(job_card_id_param, 10);
        if (isNaN(job_card_id)) {
            job_card_id = 0;
        }


        try {
            // const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);


            const result = await this.jobCardService.getJobCardDetailByIdForEditApiService(job_card_id);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching product by id', error: err.message });
        }


    }

    public gerProductionEntryListBySearchTermApi = async (req: Request, res: Response): Promise<void> => {



        const searchQueryProductEntry = req.params.searchQueryProductEntry
        if (stringIsNullOrWhiteSpace(searchQueryProductEntry) == true) {
            res.status(404).json({ message: 'Please provide a search term' });
        }



        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: 1,
                pageSize: 50,
                searchQueryProductEntry: searchQueryProductEntry || '',

            };



            const result = await this.jobCardService.gerProductionEntryListBySearchTermService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public insertUpdateProductionEntryApi = async (req: Request, res: Response) => {
        try {



            const model: IJobProductionEntryForm = req.body;

            const responseBody: ServiceResponseInterface = {
                success: false,
                responseMessage: '',
                primaryKeyValue: null
            };


            if (stringIsNullOrWhiteSpace(model.job_card_id) || stringIsNullOrWhiteSpace(model.machine_id)
                || stringIsNullOrWhiteSpace(model.waste_value) || stringIsNullOrWhiteSpace(model.net_value)) {
                responseBody.responseMessage = 'Please fill all required fields';
                res.status(200).json({ Response: responseBody });
                return;
            }



            //

            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);
            model.createByUserId = busnPartnerIdHeader;


            const response = await this.jobCardService.insertUpdateProductionEntryService(model);


            res.status(200).json({ Response: response });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error processing request', error });
        }
    }

    public getAllJobProductionEntriesApi = async (req: Request, res: Response): Promise<void> => {

        const { production_entry_id, job_card_id, machine_name, pageNo = 1, pageSize = 10 } = req.query;

        try {
            //const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 10,
                production_entry_id: production_entry_id ? production_entry_id : "",
                job_card_id: job_card_id ? job_card_id : "",
                machine_name: machine_name || '',

            };

            console.log('formData', formData);

            const result = await this.jobCardService.getAllJobProductionEntriesApi(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public insertCardDispatchInfoApi = async (req: Request, res: Response) => {
        try {



            const model: IJobCardDispatchInfoForm = req.body;

            const responseBody: ServiceResponseInterface = {
                success: false,
                responseMessage: '',
                primaryKeyValue: null
            };


            if (stringIsNullOrWhiteSpace(model.item_name)) {
                responseBody.responseMessage = 'Please fill all required fields';
                res.status(200).json({ Response: responseBody });
                return;
            }

            if (model.deliveryChallanLineItems?.length === 0) {
                responseBody.responseMessage = 'Please add at least one item in the line items!';
                res.status(200).json({ Response: responseBody });
                return;
            }

            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);
            model.createByUserId = busnPartnerIdHeader;


            const response = await this.jobCardService.insertCardDispatchInfoService(model);


            res.status(200).json({ Response: response });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error processing request', error });
        }
    }

    public getJobDispatchReportDataApi = async (req: Request, res: Response): Promise<void> => {

        const { job_card_id, fromDate, toDate, pageNo = 1, pageSize = 2000 } = req.query;

        try {
            //const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 10,
                job_card_id: job_card_id ? job_card_id : "",
                fromDate: fromDate || '',
                toDate: toDate || '',

            };

            console.log('formData', formData);

            const result = await this.jobCardService.getJobDispatchReportDataService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public getJobDispatchReportDataByIdApi = async (req: Request, res: Response): Promise<void> => {

        const card_dispatch_info_id_param = req.params.card_dispatch_info_id;
        if (stringIsNullOrWhiteSpace(card_dispatch_info_id_param) == true) {
            res.status(404).json({ message: 'Please provide a purchase order id' });
        }

        let card_dispatch_info_id = parseInt(card_dispatch_info_id_param, 10);
        if (isNaN(card_dispatch_info_id)) {
            card_dispatch_info_id = 0;
        }


        try {
            //  const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);


            const result = await this.jobCardService.getJobDispatchReportDataByIdService(card_dispatch_info_id);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public getMachineBaseReportApi = async (req: Request, res: Response): Promise<void> => {
        try {

            const { fromDate, toDate, commaSeparatedMachineIds, machineTypeId, pageNo = 1, pageSize = 2000 } = req.query;
            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 2000,
                fromDate: fromDate ? fromDate : "",
                toDate: toDate || '',
                commaSeparatedMachineIds: commaSeparatedMachineIds || '',
                machineTypeId: machineTypeId || 0,

            };


            const result = await this.jobCardService.getMachineBaseReportService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public getAllProductsForProductionEntryApi = async (req: Request, res: Response): Promise<void> => {

        const { job_card_no, company_name, product_name, pageNo = 1, pageSize = 10 } = req.query;

        try {
            //const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: 2000,

            };

            console.log('formData', formData);

            const result = await this.jobCardService.getAllProductsForProductionEntryService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public getDispatchForAutoComplete = async (req: Request, res: Response): Promise<void> => {
        try {
            const { dispatchNo } = req.query;
            const result = await this.jobCardService.getDispatchForAutoComplete(dispatchNo as string);
            res.status(200).json(result);
        } catch (err: any) {
            res.status(500).json({ message: 'error fetching dispatch numbers', error: err.message });
        }
    }
}
