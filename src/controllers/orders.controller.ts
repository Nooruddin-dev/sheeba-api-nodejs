import { Request, Response } from 'express';
import OrdersService from '../services/orders.service';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { getBusnPartnerIdFromApiHeader } from '../utils/authHelpers/AuthMainHelper';
import { IPurchaseOrderRequestForm } from '../models/orders/IPurchaseOrderRequestForm';
import { IPurchaseOrderStatusUpdateRequestForm } from '../models/orders/IPurchaseOrderStatusUpdateRequestForm';


class OrdersController {
    private ordersService: OrdersService;

    constructor() {
        this.ordersService = new OrdersService();
    }

    public createPurchaseOrder = async (req: Request, res: Response) => {
        try {



            const model: IPurchaseOrderRequestForm = req.body;

            const responseBody: ServiceResponseInterface = {
                success: false,
                responseMessage: '',
                primaryKeyValue: null
            };



            if (stringIsNullOrWhiteSpace(model.po_reference) || stringIsNullOrWhiteSpace(model.delivery_date)
                || stringIsNullOrWhiteSpace(model.company_name) || stringIsNullOrWhiteSpace(model.order_date) || stringIsNullOrWhiteSpace(model.vendor_id)
                || stringIsNullOrWhiteSpace(model.sale_representative_id) || stringIsNullOrWhiteSpace(model.purchaser_name)) {
                responseBody.responseMessage = 'Please fill all required fields';
                res.status(200).json({ Response: responseBody });
                return;
            }

            model.show_company_detail = model.show_company_detail == undefined ? true : model.show_company_detail;

            if (model.cartAllProducts == undefined || model.cartAllProducts == null || model.cartAllProducts?.length < 1) {
                responseBody.responseMessage = 'Please select at least one product!';
                res.status(200).json({ Response: responseBody });
                return;
            }





            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);
            model.createByUserId = busnPartnerIdHeader;



            const response = await this.ordersService.createPurchaseOrderService(model);


            res.status(200).json({ Response: response });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error processing request', error });
        }
    };

    public getAllPurchaseOrdersList = async (req: Request, res: Response): Promise<void> => {





        const { purchase_order_id, po_number, company_name, pageNo = 1, pageSize = 10 } = req.query;

        try {
            //const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 10,
                purchase_order_id: purchase_order_id ? purchase_order_id : 0,
                po_number: po_number || '',
                company_name: company_name || '',
            };

            console.log('formData', formData);

            const result = await this.ordersService.getAllPurchaseOrdersListService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public getPurchaseOrderDetailsById = async (req: Request, res: Response): Promise<void> => {

        const purchase_order_id_param = req.params.purchase_order_id;
        if (stringIsNullOrWhiteSpace(purchase_order_id_param) == true) {
            res.status(404).json({ message: 'Please provide a purchase order id' });
        }

        let purchase_order_id = parseInt(purchase_order_id_param, 10);
        if (isNaN(purchase_order_id)) {
            purchase_order_id = 0;
        }


        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);


            const result = await this.ordersService.getPurchaseOrderDetailById(purchase_order_id);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public getPurchaseOrderDetailForEditCloneByIdApi = async (req: Request, res: Response): Promise<void> => {

        const purchase_order_id_param = req.params.purchase_order_id;
        if (stringIsNullOrWhiteSpace(purchase_order_id_param) == true) {
            res.status(404).json({ message: 'Please provide a purchase order id' });
        }

        let purchase_order_id = parseInt(purchase_order_id_param, 10);
        if (isNaN(purchase_order_id)) {
            purchase_order_id = 0;
        }


        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            //--get purchase order detail for edit/clone/copy by order id
            const result = await this.ordersService.getPurchaseOrderDetailForEditCloneByIdService(purchase_order_id);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching product by id', error: err.message });
        }


    }

    public updatePurchaseOrderStatusApi = async (req: Request, res: Response) => {
        try {



            const model: IPurchaseOrderStatusUpdateRequestForm = req.body;

            const responseBody: ServiceResponseInterface = {
                success: false,
                responseMessage: '',
                primaryKeyValue: null
            };


            if (stringIsNullOrWhiteSpace(model.purchase_order_id) || stringIsNullOrWhiteSpace(model.status_id) || model.purchase_order_id < 1 || model.status_id < 1) {
                responseBody.responseMessage = 'Purchase order id and status id is required!';
                res.status(200).json({ Response: responseBody });
                return;
            }


            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);
            model.createByUserId = busnPartnerIdHeader;


            const response = await this.ordersService.updatePurchaseOrderStatusService(model);


            res.status(200).json({ Response: response });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error processing request', error });
        }
    };



}




export default OrdersController;
