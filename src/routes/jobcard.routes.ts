import { Router } from 'express';
import JobCardController from '../controllers/jobcard.controller';


const jobCardRoutes = Router();
const jobCardController = new JobCardController();

jobCardRoutes.get('/get-products-list-for-job-card-by-search-term/:searchQueryProduct', jobCardController.gerProductsListForJobCardBySearchTermApi);
jobCardRoutes.post('/create-job-card', jobCardController.createJobCardApi);
jobCardRoutes.get('/get-job-card-list', jobCardController.getAllJobCardsListApi);
jobCardRoutes.get('/get-job-card-detail-by-id-for-edit/:job_card_id', jobCardController.getJobCardDetailByIdForEditApi);
jobCardRoutes.get('/get-job-cards-by-search-term-for-production-entry/:searchQueryProductEntry', jobCardController.gerProductionEntryListBySearchTermApi);
jobCardRoutes.post('/insert-update-production-entry', jobCardController.insertUpdateProductionEntryApi);
jobCardRoutes.get('/get-job-production-entries', jobCardController.getAllJobProductionEntriesApi);
jobCardRoutes.post('/insert-card-dispatch-info', jobCardController.insertCardDispatchInfoApi);
jobCardRoutes.get('/get-job-dispatch-report-data', jobCardController.getJobDispatchReportDataApi);
jobCardRoutes.get('/get-job-dispatch-report-data-by-id/:card_dispatch_info_id', jobCardController.getJobDispatchReportDataByIdApi);
jobCardRoutes.get('/get-machine-based-report-api', jobCardController.getMachineBaseReportApi);
jobCardRoutes.get('/get-all-products-for-production-entry', jobCardController.getAllProductsForProductionEntryApi);
jobCardRoutes.get('/dispatch-auto-complete', jobCardController.getDispatchForAutoComplete);


export default jobCardRoutes;