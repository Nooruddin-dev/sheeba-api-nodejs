import { Request, Response } from 'express';
import { getBusnPartnerIdFromApiHeader } from '../utils/authHelpers/AuthMainHelper';
import MachinesService from '../services/machines.services';
import { IMachineRequestForm } from '../models/machines/IMachineRequestForm';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';


class MachinesController {
    private machinesService: MachinesService;

    constructor() {
        this.machinesService = new MachinesService();
    }



    public getMachinesTypes = async (req: Request, res: Response): Promise<void> => {

        const { pageNo = 1, pageSize = 10 } = req.query;

        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 10,
            };

            console.log('formData', formData);

            const result = await this.machinesService.getMachinesTypesService(formData);
            res.status(200).json(result);

        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public insertUpdateMachine = async (req: Request, res: Response) => {
        try {



            const model: IMachineRequestForm = req.body;

            const responseBody: ServiceResponseInterface = {
                success: false,
                responseMessage: '',
                primaryKeyValue: null
            };


            if (stringIsNullOrWhiteSpace(model.machine_name)) {
                responseBody.responseMessage = 'Machine name is required!';
                res.status(200).json({ Response: responseBody });
                return;
            }

            if (model.machine_type_id == undefined || model.machine_type_id < 1) {
                responseBody.responseMessage = 'Machine type is required!';
                res.status(200).json({ Response: responseBody });
                return;
            }

            if (model.is_active == undefined) {
                responseBody.responseMessage = 'Status is required!';
                res.status(200).json({ Response: responseBody });
                return;
            }
           


            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);
            model.createByUserId = busnPartnerIdHeader;

            const machineDetails = await this.machinesService.getMachineDetailsByMachineNameService(model.machine_name);
            if (model.machine_id != undefined && model.machine_id > 0 && machineDetails) {

                if ((machineDetails.machine_id != model.machine_id)) {
                    responseBody.responseMessage = 'Machine name already exists!';
                    res.status(200).json({ Response: responseBody });
                    return;
                }
            } else {
                if (machineDetails && machineDetails.machine_id > 0) {
                    responseBody.responseMessage = 'Machine name already exists!';
                    res.status(200).json({ Response: responseBody });
                    return;
                }
            }


            const response = await this.machinesService.insertUpdateMachineService(model);


            res.status(200).json({ Response: response });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error processing request', error });
        }
    };

    public getAllMachine = async (req: Request, res: Response): Promise<void> => {





        const { machine_id, machine_name, pageNo = 1, pageSize = 10 } = req.query;

        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 10,
                machine_id: machine_id ? machine_id : 0,
                machine_name: machine_name || '',
               
            };

            console.log('formData', formData);

            const result = await this.machinesService.getAllMachineService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }


}




export default MachinesController;
