import { Router } from 'express';
import VoucherController from '../controllers/voucher.controller';


const voucherRoutes = Router();
const voucherControllerObj = new VoucherController();

voucherRoutes.get('/', voucherControllerObj.getVouchers);
voucherRoutes.patch('/cancel/:id', voucherControllerObj.cancelGrn);
voucherRoutes.get('/get_purchase_order_detail_for_grn_voucher/:purchase_order_id', voucherControllerObj.getPurchaseOrderDetailsForGrnVoucher);
voucherRoutes.get('/get-purchase-order-list-for-grn-voucher-by-search-term/:searchQueryOrder', voucherControllerObj.gerPurchaseOrdersListForGrnVoucherBySearchTerm);
voucherRoutes.post('/create-grn-voucher', voucherControllerObj.createGrnVoucherApi);
voucherRoutes.get('/get-grn-vouchers-list', voucherControllerObj.getGrnVouchersListApi);
voucherRoutes.get('/get-grn-voucher-detail-by-id/:voucher_id', voucherControllerObj.getGrnVoucherDetailByIdApi);


export default voucherRoutes;