import { HandleError } from "../configurations/error";
import { Request, Response } from 'express';
import GrnService from "../services/grn.service";
import { getBusnPartnerIdFromApiHeader } from "../utils/authHelpers/AuthMainHelper";

class GrnController {
    private readonly grnService: GrnService;

    constructor() {
        this.grnService = new GrnService();
    }

    public getVouchers = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.grnService.getByFilter(req.query);
            res.status(200).json(result);
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const data = await this.grnService.getById(Number(id));
            res.status(200).json(data);
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public upsert = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = getBusnPartnerIdFromApiHeader(req);
            const body = {
                userId,
                ...req.body
            };
            const data = await this.grnService.upsertGrn(body);
            res.status(200).json(data);
        }
        catch (error) {
            HandleError(res, error);
        }
    }
}

export default GrnController;