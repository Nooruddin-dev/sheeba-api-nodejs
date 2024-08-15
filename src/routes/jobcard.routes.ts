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



export default jobCardRoutes;