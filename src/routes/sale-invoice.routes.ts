import { Router } from 'express';
import SaleInvoiceController from '../controllers/sale-invoice.controller';


const saleInvoiceRoutes = Router();
const saleInvoiceController = new SaleInvoiceController();

saleInvoiceRoutes.post('/', saleInvoiceController.createSalesInvoices);
saleInvoiceRoutes.get('/', saleInvoiceController.getSalesInvoicesByParam);
saleInvoiceRoutes.get('/:id', saleInvoiceController.getSalesInvoicesById);

export default saleInvoiceRoutes;