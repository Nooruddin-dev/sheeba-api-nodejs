import { Router } from 'express';
import InventoryController from '../controllers/inventory.controller';


const inventoryRoutes = Router();
const inventoryController = new InventoryController();

inventoryRoutes.get('/get_all_products', inventoryController.getAllProducts);
inventoryRoutes.post('/insert-update-product', inventoryController.insertUpdateProduct);
inventoryRoutes.get('/get-products-list-by-search-term/:searchQueryProduct', inventoryController.getProductsListBySearchTermApi);
inventoryRoutes.get('/get-product-detail-by-id/:productid', inventoryController.getProductDetailById);
inventoryRoutes.get('/get_tax_rules', inventoryController.getTaxRules);
inventoryRoutes.get('/get-units-list', inventoryController.getUnitsList);


export default inventoryRoutes;