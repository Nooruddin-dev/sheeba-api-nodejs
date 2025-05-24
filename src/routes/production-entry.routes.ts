import { Router } from 'express';
import { ProductionEntryController } from '../controllers/production-entry.controller';
import { auth } from '../middlewares/auth.middleware';


const productionEntryRouter = Router();
const controller = new ProductionEntryController();
productionEntryRouter.get('/', auth, controller.getProductionEntries);
productionEntryRouter.put('/', auth, controller.createProductionEntry);
productionEntryRouter.delete('/:id', auth, controller.deleteProductionEntry);

export default productionEntryRouter;