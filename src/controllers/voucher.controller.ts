import { Request, Response } from 'express';
import VoucherServices from "../services/voucher.services";
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { getBusnPartnerIdFromApiHeader } from '../utils/authHelpers/AuthMainHelper';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { IGrnVoucherCreateRequestForm } from '../models/voucher/IGrnVoucherCreateRequestForm';



class VoucherController {

    private voucherService: VoucherServices;


    constructor() {
        this.voucherService = new VoucherServices();
    }

    public getPurchaseOrderDetailsForGrnVoucher = async (req: Request, res: Response): Promise<void> => {

        const purchase_order_idParam = req.params.purchase_order_id;
        if (stringIsNullOrWhiteSpace(purchase_order_idParam) == true) {
            res.status(404).json({ message: 'Please provide a purchase order id' });
        }

        let purchase_order_id = parseInt(purchase_order_idParam, 10);
        if (isNaN(purchase_order_id)) {
            purchase_order_id = 0;
        }


        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);


            const result =  await this.voucherService.getPurchaseOrderDetailsForGrnVoucherApi(purchase_order_id);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public gerPurchaseOrdersListForGrnVoucherBySearchTerm = async (req: Request, res: Response): Promise<void> => {



        const searchQueryOrder = req.params.searchQueryOrder
        if (stringIsNullOrWhiteSpace(searchQueryOrder) == true) {
            res.status(404).json({ message: 'Please provide a search term' });
        }



        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: 1,
                pageSize: 50,
                searchQueryOrder: searchQueryOrder || '',

            };



            const result = await this.voucherService.gerPurchaseOrdersListForGrnVoucherBySearchTermService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public createGrnVoucherApi = async (req: Request, res: Response) => {
        try {
            const model: IGrnVoucherCreateRequestForm = req.body;
            const responseBody: ServiceResponseInterface = {
                success: false,
                responseMessage: '',
                primaryKeyValue: null
            };

            if (stringIsNullOrWhiteSpace(model.po_number) || stringIsNullOrWhiteSpace(model.receiver_name)
                || stringIsNullOrWhiteSpace(model.receiver_contact) || stringIsNullOrWhiteSpace(model.grn_date)) {
                responseBody.responseMessage = 'Please fill all required fields';
                res.status(200).json({ Response: responseBody });
                return;
            }

            model.show_company_detail = model.show_company_detail == undefined ? true : model.show_company_detail;
            if (model.products == undefined || model.products == null || model.products?.length < 1) {
                responseBody.responseMessage = 'Please select order items!';
                res.status(400).json({ Response: responseBody });
                return;
            }

            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);
            model.created_by_user_id = busnPartnerIdHeader;

            const response = await this.voucherService.createGrnVoucherService(model);
            res.status(200).json({ Response: response });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error processing request', error });
        }
    };


    public getGrnVouchersListApi = async (req: Request, res: Response): Promise<void> => {

        const { voucher_number, po_number, receiver_name, pageNo = 1, pageSize = 10 } = req.query;

        try {
            //const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 10,
                voucher_number: voucher_number || '',
                po_number: po_number || '',
                receiver_name: receiver_name || '',
            };

            console.log('formData', formData);

            const result = await this.voucherService.getGrnVouchersListService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public getGrnVoucherDetailByIdApi = async (req: Request, res: Response): Promise<void> => {

        const voucher_id_param = req.params.voucher_id;
        if (stringIsNullOrWhiteSpace(voucher_id_param) == true) {
            res.status(404).json({ message: 'Please provide a voucher id' });
        }

        let voucher_id = parseInt(voucher_id_param, 10);
        if (isNaN(voucher_id)) {
            voucher_id = 0;
        }


        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);


            const result = await this.voucherService.getGrnVoucherDetailByIdService(voucher_id);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }


}

export default VoucherController;