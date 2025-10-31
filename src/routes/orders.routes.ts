import { Router } from 'express';
import OrdersController from '../controllers/orders.controller';


const ordersRoutes = Router();
const ordersController = new OrdersController();


ordersRoutes.get('/auto-complete', ordersController.autoComplete)

ordersRoutes.post('/create-purchase-order', ordersController.createPurchaseOrder);
ordersRoutes.get('/get-all-purchase-orders', ordersController.getAllPurchaseOrdersList);
ordersRoutes.get('/get-purchase-order-details/:purchase_order_id', ordersController.getPurchaseOrderDetailsById);
ordersRoutes.get('/get-purchase-order-details-for-edit-clone/:purchase_order_id', ordersController.getPurchaseOrderDetailForEditCloneByIdApi);
ordersRoutes.post('/update-purchase-order-status', ordersController.updatePurchaseOrderStatusApi);

ordersRoutes.get('/:id', ordersController.getById)


export default ordersRoutes;

