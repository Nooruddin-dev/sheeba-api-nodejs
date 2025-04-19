import { Router } from 'express';
import ReportsController from '../controllers/reports.controller';

const reportsReport = Router();
const reportsController = new ReportsController();

reportsReport.get('/stock', reportsController.getStockReport);
reportsReport.get('/job-summary', reportsController.getJobSummaryReport);
reportsReport.get('/machine-summary', reportsController.getMachineSummary);
reportsReport.get('/grn', reportsController.getGrn);
reportsReport.get('/dispatch', reportsController.getDispatch);

export default reportsReport;