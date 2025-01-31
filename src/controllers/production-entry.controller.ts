import { Request, Response } from 'express';
import { BusinessError, HandleError } from "../configurations/error";
import { ProductionEntryService } from '../services/production-entry.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class ProductionEntryController {
    
    constructor() {
        this.productionEntryService = new ProductionEntryService();
    }

    private readonly productionEntryService: ProductionEntryService;
    
    public getProductionEntries = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.productionEntryService.getByFilter(req.query);
            res.status(200).json(result);
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public createProductionEntry = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.productionEntryService.create(req.body, (req as AuthRequest).user);
            res.status(200).json(result);
        }
        catch (error) {
            HandleError(res, error);
        }
    }
}