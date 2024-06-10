import { Router } from 'express';
import OrdersController from '../controllers/orders.controller';


const ordersRoutes = Router();
const ordersController = new OrdersController();


ordersRoutes.post('/create-purchase-order', ordersController.createPurchaseOrder);
ordersRoutes.get('/get-all-purchase-orders', ordersController.getAllPurchaseOrdersList);
ordersRoutes.get('/get-purchase-order-details/:purchase_order_id', ordersController.getPurchaseOrderDetailsById);



export default ordersRoutes;

