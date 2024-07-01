import { Request, Response } from 'express';
import VoucherServices from "../services/voucher.services";
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { getBusnPartnerIdFromApiHeader } from '../utils/authHelpers/AuthMainHelper';



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


}

export default VoucherController;