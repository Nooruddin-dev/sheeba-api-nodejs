import { Request, Response } from 'express';
import UserService from '../services/user.service';
import { encryptPassword, getBusnPartnerIdFromApiHeader } from '../utils/authHelpers/AuthMainHelper';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';
import { stringIsNullOrWhiteSpace } from '../utils/commonHelpers/ValidationHelper';
import { IBusnPartnerRequestForm } from '../models/usersManagement/Forms/IBusnPartnerRequestForm';
import { BusinessPartnerTypesEnum } from '../models/enum/GlobalEnums';
import { IDeleteRecordRequestForm } from '../models/usersManagement/Forms/IDeleteRecordRequestForm';
import { dynamicDataDeleteService } from '../services/dynamic.service';
import { HandleError } from '../configurations/error';


class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public autoComplete = async (req: Request, res: Response): Promise<void> => {
      try {
          console.log('autoComplete', req.query);;
          const data = await this.userService.autoComplete(req.query);
          res.status(200).json(data);
      }
      catch (error) {
          HandleError(res, error);
      }
  }



  public getUserLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const model = req.body;

      if (!model || !model.userName || !model.password) {
        res.status(400).json({ message: "Incorrect username or password" });
        return;
      }

      


      console.log('pass', model.password)
      const encryptedPassword = encryptPassword(model.password, 5);
      console.log('pass', encryptedPassword)
      const user = await this.userService.getUserLogin(model.userName, encryptedPassword);
      console.log(user)
      if (!user) {
        res.status(400).json({ message: "Incorrect username or password" });
        return;
      }

      res.status(200).json({ User: user });

    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching users', error });
    }
  };

  public getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const user = await this.userService.getUser(userId);
      if (user) {
        res.status(200).json(user);
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching users', error });
    }
  };



  public getAllBusinessPartners = async (req: Request, res: Response): Promise<void> => {

    const { busnPartnerId, busnPartnerTypeId, firstName, emailAddress, pageNo = 1, pageSize = 10 } = req.query;

    try {
      const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

      const formData = {
        pageNo: pageNo ?? 1,
        pageSize: pageSize ?? 10,
        busnPartnerId: busnPartnerId ? busnPartnerId : 0,
        busnPartnerTypeId: busnPartnerTypeId ?? 0,
        firstName: firstName || '',
        emailAddress: emailAddress || ''
      };

      console.log('formData', formData);

      const result = await this.userService.getBusinessPartnersService(formData);

      if (result) {
        for (let item of result) {

          const resultAddressAssociation = await this.userService.getBusinessPartnerAddressAssociationService(item.BusnPartnerId);
          item.busnPartnerAddressAssociationBusnPartners = resultAddressAssociation;

          const resultPhoneAssociation = await this.userService.getBusinessPartnerPhonesAssociationService(item.BusnPartnerId);
          item.busnPartnerPhoneAssociation = resultPhoneAssociation;
          

          //--If sale representatives
          if(item.BusnPartnerTypeId == BusinessPartnerTypesEnum.SalesRepresentative){
            const sales_representative_details = await this.userService.getSaleRepresentativeDetailOfBusinessPartnerService(item.BusnPartnerId);
            item.sales_representative_details = sales_representative_details;
          }
        }
      }

      if (!result) {
        res.status(404).json({ message: 'Not Found' });
      } else {
        res.status(200).json(result);
      }
    } catch (err: any) {

      res.status(500).json({ message: 'Error fetching users', error: err.message });
    }


  }

  public insertUpdateBusinessPartner = async (req: Request, res: Response) => {
    try {

      const model: IBusnPartnerRequestForm = req.body;

      const responseBody: ServiceResponseInterface = {
        success: false,
        responseMessage: '',
        primaryKeyValue: null
      };


      if (!model.firstName || !model.lastName || !model.emailAddress || model.isActive == undefined) {
        responseBody.responseMessage = 'Please fill all required fields';
        res.status(200).json({ Response: responseBody });
        return;
      }

      if (model.busnPartnerTypeId < 1) {
        responseBody.responseMessage = 'User type is required!';
        res.status(200).json({ Response: responseBody });
        return;
      }

      if (model.busnPartnerId == undefined || model.busnPartnerId == null || model.busnPartnerId < 1) {
        if (stringIsNullOrWhiteSpace(model.password)) {
          responseBody.responseMessage = 'Password field is required!';
          res.status(200).json({ Response: responseBody });
          return;
        }
      }

      //-- if business partner is sale representative
      if (model.busnPartnerTypeId == BusinessPartnerTypesEnum.SalesRepresentative) {
        if (model.saleRepresentativeVendorId == undefined || model.saleRepresentativeVendorId == null || model.saleRepresentativeVendorId < 1) {
          responseBody.responseMessage = 'Venodr is required for sale representative!';
          res.status(200).json({ Response: responseBody });
          return;
        }
       
      }


      // const busnPartnerByEmail = await this.userService.getBusinessPartnerByEmailService(model.emailAddress);
      // if (model.busnPartnerId != undefined && model.busnPartnerId > 0 && busnPartnerByEmail) {

      //   if ((busnPartnerByEmail.BusnPartnerId != model.busnPartnerId)) {
      //     responseBody.responseMessage = 'Email address already exists!';
      //     res.status(200).json({ Response: responseBody });
      //     return;
      //   }
      // } else {
      //   if (busnPartnerByEmail && busnPartnerByEmail.BusnPartnerId > 0) {
      //     responseBody.responseMessage = 'Email address already exists!';
      //     res.status(200).json({ Response: responseBody });
      //     return;
      //   }
      // }

      const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);
      model.createByUserId = busnPartnerIdHeader;



      model.password = encryptPassword(model.password, 5);

      const response = await this.userService.insertUpdateBusnPartnerservice(model);

      res.status(200).json({ Response: response });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error processing request', error });
    }
  };

  public getBusinessPartnerTypes = async (req: Request, res: Response): Promise<void> => {

    const { pageNo = 1, pageSize = 10 } = req.query;

    try {
      const busnPartnerIdHeader = getBusnPartnerIdFromApiHeader(req);

      const formData = {
        pageNo: pageNo ?? 1,
        pageSize: pageSize ?? 10,
      };

      console.log('formData', formData);

      const result = await this.userService.getBusinessPartnerTypesService(formData);
      res.status(200).json(result);

    } catch (err: any) {

      res.status(500).json({ message: 'Error fetching users', error: err.message });
    }


  }


  public deleteAnyRecordApi = async (req: Request, res: Response) => {
    try {

      const model: IDeleteRecordRequestForm = req.body;

      const responseBody: ServiceResponseInterface = {
        success: false,
        responseMessage: '',
        primaryKeyValue: null
      };


      if (!model.entityName || !model.entityColumnName || !model.entityRowId) {
        responseBody.responseMessage = 'Please fill all required fields';
        res.status(200).json({ Response: responseBody });
        return;
      }


    //  const response = await this.userService.insertUpdateBusnPartnerservice(model);
      const response  = await  dynamicDataDeleteService(model.entityName, model.entityColumnName, model.entityRowId)

      res.status(200).json({ Response: response });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error processing request', error });
    }
  };

}




export default UserController;
