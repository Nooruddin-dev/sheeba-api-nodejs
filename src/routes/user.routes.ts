import { Router } from 'express';
import UserController from '../controllers/user.controller';


const router = Router();
const userController = new UserController();

router.get('/get_user_by_id/:id', userController.getUserById);

// Route to get a user by ID
router.get('/get-all-business-partners', userController.getAllBusinessPartners);

router.post('/get_login_user', userController.getUserLogin);
router.post('/insert-update-business-partner', userController.insertUpdateBusinessPartner);
router.get('/get-business-partner-types', userController.getBusinessPartnerTypes);
router.post('/delete-any-record', userController.deleteAnyRecordApi);



export default router;