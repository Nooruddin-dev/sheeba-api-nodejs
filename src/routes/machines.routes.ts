import { Router } from 'express';
import MachinesController from '../controllers/machines.controller';
import { auth } from '../middlewares/auth.middleware';


const machinesRoutes = Router();
const machinesController = new MachinesController();

machinesRoutes.get('/auto-complete', auth, machinesController.autoComplete);
machinesRoutes.get('/get-machines-types', machinesController.getMachinesTypes);
machinesRoutes.get('/get_all_machines', machinesController.getAllMachine);
machinesRoutes.post('/insert-update-machine', machinesController.insertUpdateMachine);


export default machinesRoutes;