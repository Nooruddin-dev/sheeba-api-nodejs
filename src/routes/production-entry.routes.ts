import { Router } from 'express';
import { ProductionEntryController } from '../controllers/production-entry.controller';
import { auth } from '../middlewares/auth.middleware';


const productionEntryRouter = Router();
const controller = new ProductionEntryController();
productionEntryRouter.get('/', auth, controller.getProductionEntries);
productionEntryRouter.get('/latest-consumed-products', auth, controller.getLatestConsumedProducts);
productionEntryRouter.put('/', auth, controller.createProductionEntry);

export default productionEntryRouter;