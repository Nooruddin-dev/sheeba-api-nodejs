import { Router } from 'express';
import VoucherController from '../controllers/voucher.controller';


const voucherRoutes = Router();
const voucherControllerObj = new VoucherController();

voucherRoutes.get('/get_purchase_order_detail_for_grn_voucher/:purchase_order_id', voucherControllerObj.getPurchaseOrderDetailsForGrnVoucher);
voucherRoutes.get('/get-purchase-order-list-for-grn-voucher-by-search-term/:searchQueryOrder', voucherControllerObj.gerPurchaseOrdersListForGrnVoucherBySearchTerm);

export default voucherRoutes;