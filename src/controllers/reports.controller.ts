import { Request, Response } from 'express';
import InventoryService from '../services/inventory.service';
import { HandleError } from '../configurations/error';
import JobCardService from '../services/jobcard.service';
import MachinesService from '../services/machines.services';
import OrdersService from '../services/orders.service';


export default class ReportsController {
    constructor() {
        this.inventoryService = new InventoryService();
        this.jobCardService = new JobCardService();
        this.machineService = new MachinesService();
        this.orderService = new OrdersService();
    }

    private readonly inventoryService: InventoryService;
    private readonly jobCardService: JobCardService;
    private readonly machineService: MachinesService;
    private readonly orderService: OrdersService;

    public getStockReport = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.inventoryService.getStockReport(req.query)
            res.status(200).json(data);
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public getJobSummaryReport = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.jobCardService.getJobSummaryReport(req.query)
            res.status(200).json(data);
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public getMachineSummary = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.machineService.getMachineSummary(req.query)
            res.status(200).json(data);
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public getGrn = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.orderService.getGrnReport(req.query)
            res.status(200).json(data);
        }
        catch (error) {
            HandleError(res, error);
        }
    }

    public getDispatch = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.jobCardService.getDispatchReport(req.query)
            res.status(200).json(data);
        }
        catch (error) {
            HandleError(res, error);
        }
    }
}
