import { Router } from 'express';
import MachinesController from '../controllers/machines.controller';


const machinesRoutes = Router();
const machinesController = new MachinesController();

machinesRoutes.get('/get-machines-types', machinesController.getMachinesTypes);
machinesRoutes.get('/get_all_machines', machinesController.getAllMachine);
machinesRoutes.post('/insert-update-machine', machinesController.insertUpdateMachine);




export default machinesRoutes;