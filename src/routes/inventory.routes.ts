import { Router } from 'express';
import InventoryController from '../controllers/inventory.controller';
import { auth } from '../middlewares/auth.middleware';


const inventoryRoutes = Router();
const inventoryController = new InventoryController();

inventoryRoutes.get('/units', auth, inventoryController.getUnits);

inventoryRoutes.get('/get_all_products', inventoryController.getAllProducts);
inventoryRoutes.post('/insert-update-product', inventoryController.insertUpdateProduct);
inventoryRoutes.get('/get-products-list -by-search-term/:searchQueryProduct', inventoryController.getProductsListBySearchTermApi);
inventoryRoutes.get('/get-product-detail-by-id/:productid', inventoryController.getProductDetailById);
inventoryRoutes.get('/get_tax_rules', inventoryController.getTaxRules);
inventoryRoutes.get('/get-units-list', inventoryController.getUnitsList);

inventoryRoutes.put('/', auth, inventoryController.create);
inventoryRoutes.patch('/:id', auth, inventoryController.update);
inventoryRoutes.delete('/:id', auth, inventoryController.delete);
inventoryRoutes.get('/:id', auth, inventoryController.getById);
inventoryRoutes.get('/', auth, inventoryController.get);

export default inventoryRoutes;