import { Request, Response } from 'express';
import UserService from '../services/user.service';
import InventoryService from '../services/inventory.service';
import { IProductRequestForm } from '../models/inventory/IProductRequestForm';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { getBusnPartnerIdFromApiHeader } from '../utils/authHelpers/AuthMainHelper';


class InventoryController {
    private inventoryService: InventoryService;

    constructor() {
        this.inventoryService = new InventoryService();
    }


    public insertUpdateProduct = async (req: Request, res: Response) => {
        try {



            const model: IProductRequestForm = req.body;

            const responseBody: ServiceResponseInterface = {
                success: false,
                responseMessage: '',
                primaryKeyValue: null
            };


            if (stringIsNullOrWhiteSpace(model.productName) || stringIsNullOrWhiteSpace(model.sku)) {
                responseBody.responseMessage = 'Please fill all required fields';
                res.status(200).json({ Response: responseBody });
                return;
            }





            if (model.productId == undefined || model.productId == null || model.productId < 1) {

                if (stringIsNullOrWhiteSpace(model.stockQuantity) || model.stockQuantity < 0) {
                    responseBody.responseMessage = 'Please define stock quantity!';
                    res.status(200).json({ Response: responseBody });
                    return;
                }

                if (stringIsNullOrWhiteSpace(model.price) || model.price == undefined || model.price == null || model.price < 0) {
                    responseBody.responseMessage = 'Cost is required!';
                    res.status(200).json({ Response: responseBody });
                    return;
                }


            }

            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);
            model.createByUserId = busnPartnerIdHeader;


            const response = await this.inventoryService.insertUpdateProductService(model);
            

            res.status(200).json({ Response: response });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error processing request', error });
        }
    };


    public getAllProducts = async (req: Request, res: Response): Promise<void> => {





        const { productId, productName, sku, pageNo = 1, pageSize = 10 } = req.query;

        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 10,
                productId: productId ? productId : 0,
                productName: productName || '',
                sku: sku || ''
            };

            console.log('formData', formData);

            const result = await this.inventoryService.getAllProductsService(formData);

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




export default InventoryController;
