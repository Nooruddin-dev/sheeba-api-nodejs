import { Router } from 'express';
import InventoryController from '../controllers/inventory.controller';


const inventoryRoutes = Router();
const inventoryController = new InventoryController();

inventoryRoutes.get('/get_all_products', inventoryController.getAllProducts);
inventoryRoutes.post('/insert-update-product', inventoryController.insertUpdateProduct);



export default inventoryRoutes;