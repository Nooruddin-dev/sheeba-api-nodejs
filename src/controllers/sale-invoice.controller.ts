import { Request, Response } from 'express';
import { getBusnPartnerIdFromApiHeader } from "../utils/authHelpers/AuthMainHelper";
import SaleInvoiceService from '../services/sale-invoice.service';

class SaleInvoiceController {
    private readonly saleInvoiceService: SaleInvoiceService;

    constructor() {
        this.saleInvoiceService = new SaleInvoiceService();
    }

    public createSalesInvoices = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = getBusnPartnerIdFromApiHeader(req);
            const body = {
                userId,
                ...req.body
            };
            const result = await this.saleInvoiceService.createSaleInvoice(body);
            res.status(200).json(result);
        } catch (err: any) {
            res.status(500).json({ message: 'error creating sale invoice', error: err.message });
        }
    }

    public getSalesInvoicesByParam = async (req: Request, res: Response): Promise<void> => {
        try {
            const { page = 1 } = req.query;
            const body = {
                page: page ?? 1,
                pageSize: 10,
                ...req.body
            };
            const result = await this.saleInvoiceService.getSaleInvoiceByParam(body);
            res.status(200).json(result);
        } catch (err: any) {
            res.status(500).json({ message: 'error fetching records', error: err.message });
        }
    }

    public getSalesInvoicesById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const result = await this.saleInvoiceService.getSaleInvoiceById(id as any);
            res.status(200).json(result);
        } catch (err: any) {
            res.status(500).json({ message: 'error fetching sale invoice', error: err.message });
        }
    }
}

export default SaleInvoiceController;