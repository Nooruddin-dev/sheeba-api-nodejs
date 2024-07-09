import { Router } from 'express';
import JobCardController from '../controllers/jobcard.controller';


const jobCardRoutes = Router();
const jobCardController = new JobCardController();

jobCardRoutes.get('/get-products-list-for-job-card-by-search-term/:searchQueryProduct', jobCardController.gerProductsListForJobCardBySearchTermApi);
jobCardRoutes.post('/create-job-card', jobCardController.createJobCardApi);
jobCardRoutes.get('/get-job-card-list', jobCardController.getAllJobCardsListApi);

export default jobCardRoutes;