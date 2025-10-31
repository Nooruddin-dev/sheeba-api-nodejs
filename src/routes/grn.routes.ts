import { Router } from 'express';
import GrnController from '../controllers/grn.controller';


const grnRoutes = Router();
const controller = new GrnController();

grnRoutes.put('', controller.upsert);
grnRoutes.get('', controller.getVouchers);
grnRoutes.get('/:id', controller.getById);

export default grnRoutes;
