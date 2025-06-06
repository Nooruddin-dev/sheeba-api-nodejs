import { Request, Response } from 'express';
import InventoryService from '../services/inventory.service';
import { IProductRequestForm } from '../models/inventory/IProductRequestForm';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { getBusnPartnerIdFromApiHeader } from '../utils/authHelpers/AuthMainHelper';
import { dynamicDataGetByAnyColumnService, dynamicDataGetService } from '../services/dynamic.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { HandleError } from '../configurations/error';


export default class InventoryController {
    constructor() {
        this.inventoryService = new InventoryService();
    }

    private readonly inventoryService: InventoryService;

    public create = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.inventoryService.create(req.body, (req as AuthRequest).user);
            res.status(200).json({ message: 'Inventory created successfully', id: result.id });
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public update = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            await this.inventoryService.update({ id, ...req.body }, (req as AuthRequest).user);
            res.status(200).json({ message: 'Inventory updated successfully' });
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public addStock = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            await this.inventoryService.addStock({ id, ...req.body }, (req as AuthRequest).user);
            res.status(200).json({ message: 'Inventory updated successfully' });
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public delete = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.inventoryService.delete(req.body, (req as AuthRequest).user);
            res.status(200).json({ message: 'Inventory deleted successfully' });
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params
            const data = await this.inventoryService.getById(id);
            res.status(200).json(data);
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public get = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.inventoryService.get(req.query);
            res.status(200).json(data);
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public getUnits = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.inventoryService.getUnits();
            console.log(data);
            res.status(200).json(data);
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public autoComplete = async (req: Request, res: Response): Promise<void> => {
        try {
            console.log('autoComplete', req.query);;
            const data = await this.inventoryService.autoComplete(req.query);
            res.status(200).json(data);
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    // To be deprecated
    public insertUpdateProduct = async (req: Request, res: Response) => {
        try {



            const model: IProductRequestForm = req.body;

            const responseBody: ServiceResponseInterface = {
                success: false,
                responseMessage: '',
                primaryKeyValue: null
            };


            if (stringIsNullOrWhiteSpace(model.product_name) || stringIsNullOrWhiteSpace(model.sku)) {
                responseBody.responseMessage = 'Please fill all required fields';
                res.status(200).json({ Response: responseBody });
                return;
            }




            //-- product creation step
            if (model.productid == undefined || model.productid == null || model.productid < 1) {

                if (stringIsNullOrWhiteSpace(model.stockquantity) || model.stockquantity < 0) {
                    responseBody.responseMessage = 'Please define stock quantity!';
                    res.status(200).json({ Response: responseBody });
                    return;
                }

                // if (stringIsNullOrWhiteSpace(model.price) || model.price == undefined || model.price == null || model.price < 0) {
                //     responseBody.responseMessage = 'Cost is required!';
                //     res.status(200).json({ Response: responseBody });
                //     return;
                // }

                var skuData = await dynamicDataGetByAnyColumnService('products', 'sku', model.sku);
                if (skuData && skuData?.data && skuData?.data?.length > 0) {
                    responseBody.responseMessage = 'Sku already exists. Please try with another!';
                    res.status(200).json({ Response: responseBody });
                    return;
                }

                var productNameData = await dynamicDataGetByAnyColumnService('products', 'product_name', model.product_name);
                if (productNameData && productNameData?.data && productNameData?.data?.length > 0) {
                    responseBody.responseMessage = 'Product name already exists. Please try with another!';
                    res.status(200).json({ Response: responseBody });
                    return;
                }


            } else if (model.productid && model.productid > 0) {


                var productNameData = await dynamicDataGetByAnyColumnService('products', 'product_name', model.product_name);
                if (productNameData && productNameData?.data && productNameData?.data?.length > 0) {
                    if (productNameData.data?.filter((x: { productid: number | undefined; }) => x.productid != model.productid)?.length > 0) {
                        responseBody.responseMessage = 'Product name already exists. Please try with another!';
                        res.status(200).json({ Response: responseBody });
                        return;
                    }

                }

            }

            //

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





        const { productid, product_name, sku, pageNo = 1, pageSize = 10 } = req.query;

        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 10,
                productid: productid ? productid : 0,
                product_name: product_name || '',
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

    public getProductsListBySearchTermApi = async (req: Request, res: Response): Promise<void> => {



        const searchQueryProduct = req.params.searchQueryProduct
        if (stringIsNullOrWhiteSpace(searchQueryProduct) == true) {
            res.status(404).json({ message: 'Please provide a search term' });
        }



        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: 1,
                pageSize: 50,
                searchQueryProduct: searchQueryProduct || '',

            };



            const result = await this.inventoryService.getProductsListBySearchTermService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public getProductDetailById = async (req: Request, res: Response): Promise<void> => {

        const productidParam = req.params.productid;
        if (stringIsNullOrWhiteSpace(productidParam) == true) {
            res.status(404).json({ message: 'Please provide a product id' });
        }

        let productid = parseInt(productidParam, 10);
        if (isNaN(productid)) {
            productid = 0;
        }


        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);


            const result = await this.inventoryService.getProductDetailByIdApi(productid);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public getTaxRules = async (req: Request, res: Response): Promise<void> => {





        const { tax_rule_id, tax_rule_type, pageNo = 1, pageSize = 10 } = req.query;

        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 10,
                tax_rule_id: tax_rule_id ? tax_rule_id : 0,
                tax_rule_type: tax_rule_type || '',

            };



            const result = await this.inventoryService.getTaxRulesService(formData);

            if (!result) {
                res.status(404).json({ message: 'Not Found' });
            } else {
                res.status(200).json(result);
            }
        } catch (err: any) {

            res.status(500).json({ message: 'Error fetching users', error: err.message });
        }


    }

    public getUnitsList = async (req: Request, res: Response): Promise<void> => {


        const { pageNo = 1, pageSize = 10 } = req.query;

        try {
            const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

            const formData = {
                pageNo: pageNo ?? 1,
                pageSize: pageSize ?? 10,
            };

            const result = await this.inventoryService.getUnitsListService(formData);
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
