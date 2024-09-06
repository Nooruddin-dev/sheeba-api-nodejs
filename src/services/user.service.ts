import { Pool } from 'mysql2/promise';

import { UserEntity } from '../models/user.model';
import { connectionPool, withConnectionDatabase } from '../configurations/db';
import { busnPartnerAddressAssociationModel } from '../models/usersManagement/busnPartnerAddressAssociationModel';
import { busnPartnerPhoneAssociationModel } from '../models/usersManagement/busnPartnerPhoneAssociationModel';
import { IBusnPartnerRequestForm } from '../models/usersManagement/Forms/IBusnPartnerRequestForm';
import { ServiceResponseInterface } from '../models/common/ServiceResponseInterface';

class UserService {


  public async getUser(userId: string): Promise<any> {

    return withConnectionDatabase(async (connection: any) => {

      const [results] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      const userData = results as UserEntity[]

      return userData.length === 1 ? userData[0] : null;

    });




  }

  public async getUserLogin(UserName: string, Password: string): Promise<UserEntity | null> {
console.log( 'UserName' ,UserName);
console.log( 'Password' ,Password);

    return withConnectionDatabase(async (connection: any) => {
      const [results]: any = await connection.query(
        `SELECT USR.*, ATC.AttachmentURL AS ProfilePictureUrl
        FROM busnpartner USR
        LEFT JOIN attachments ATC ON ATC.AttachmentID = USR.ProfilePictureId
        WHERE ((USR.EmailAddress = ? AND USR.Password = ?) OR (USR.UserName = ? AND USR.Password = ?))
        AND USR.IsActive = 1 AND USR.IsVerified = 1
        LIMIT 1`,
        [UserName, Password, UserName, Password]
      );
      //const userData =  results[0] as UserEntity
      const userData: UserEntity = results[0];
      return userData;

    });



  }

  public async getBusinessPartnersService(FormData: any): Promise<any> {

    return withConnectionDatabase(async (connection: any) => {
      let searchParameters = '';

      if (FormData.busnPartnerTypeId > 0) {
        searchParameters += ` AND MTBL.BusnPartnerTypeId = ${FormData.busnPartnerTypeId}`;
      }

      if (FormData.busnPartnerId > 0) {
        searchParameters += ` AND MTBL.BusnPartnerId = ${FormData.busnPartnerId} `;
      }

      if (FormData.isActive != undefined && FormData.isActive !== null) {
        searchParameters += ` AND MTBL.IsActive = ${FormData.isActive} `;
      }

      if (FormData.firstName) {
        searchParameters += ` AND (MTBL.FirstName LIKE '%${FormData.firstName}%' OR MTBL.LastName LIKE '%${FormData.firstName}%')`;
      }

      if (FormData.emailAddress) {
        searchParameters += ` AND MTBL.EmailAddress LIKE '%${FormData.emailAddress}%' `;
      }

      const [results]: any = await connection.query(`
            SELECT COUNT(*) OVER () as TotalRecords, 
            MTBL.*, 
            ATC.AttachmentURL AS ProfilePicturePath, 
            BTYPE.BusnPartnerTypeName
            FROM busnpartner MTBL
            LEFT JOIN attachments ATC ON ATC.AttachmentID = MTBL.ProfilePictureId
            INNER JOIN busnpartnertype BTYPE ON BTYPE.BusnPartnerTypeId = MTBL.BusnPartnerTypeId
            WHERE MTBL.BusnPartnerId IS NOT NULL
            ${searchParameters}
            ORDER BY MTBL.BusnPartnerId DESC
            LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
        `);

      const userData: any = results;
      return userData;

    });


  }

  public async getBusinessPartnerAddressAssociationService(busnPartnerId: number): Promise<busnPartnerAddressAssociationModel[]> {

    return withConnectionDatabase(async (connection: any) => {
      let result: busnPartnerAddressAssociationModel[] = [];

      const [rows] = await connection.query(`
        SELECT MTBL.*, BPAT.AddressTypeName
        FROM busnpartneraddressassociation MTBL
        LEFT JOIN busnpartneraddresstype BPAT ON BPAT.AddressTypeId = MTBL.AddressTypeId
        WHERE MTBL.BusnPartnerId = ${busnPartnerId}
    `);

      result = rows as busnPartnerAddressAssociationModel[];
      return result;

    });



  }

  public async getBusinessPartnerPhonesAssociationService(busnPartnerId: number): Promise<busnPartnerPhoneAssociationModel[]> {

    return withConnectionDatabase(async (connection: any) => {
      let result: busnPartnerPhoneAssociationModel[] = [];
      const [rows] = await connection.query(`
        SELECT MTBL.*, BPPT.PhoneTypeName
        FROM busnpartnerphoneassociation MTBL
        LEFT JOIN busnpartnerphonetype BPPT ON BPPT.PhoneTypeId = MTBL.PhoneTypeId
        WHERE MTBL.BusnPartnerId =  ${busnPartnerId}`);

      result = rows as busnPartnerPhoneAssociationModel[];
      return result;
    });




  }


  public async getBusinessPartnerByEmailService(emailAddress: string): Promise<any> {


    return withConnectionDatabase(async (connection: any) => {
      let result: any = [];

      const [rows]: any = await connection.query(`SELECT * FROM busnpartner WHERE EmailAddress = '${emailAddress}' `);
      result = rows ? rows[0] : null;
      return result;

    });


  }

  public async insertUpdateBusnPartnerservice(formData: IBusnPartnerRequestForm): Promise<ServiceResponseInterface> {
    const response: ServiceResponseInterface = {
      success: false,
      responseMessage: '',
      primaryKeyValue: null
    };

    const connection = await connectionPool.getConnection();

    try {

      const [rows, fields]: any = await connection.execute(`CALL SP_CreateUpdateBusnPartner(${formData.busnPartnerId}, ${formData.busnPartnerTypeId}, '${formData.firstName}', '${formData.lastName}', '${formData.emailAddress}', ${formData.isActive}, ${formData.countryId}, '${formData.addressOne}', '${formData.phoneNo}', '${formData.password}', ${formData.profilePictureId}, ${formData.createByUserId}, ${formData.saleRepresentativeVendorId ?? 0})`

      );

      if (rows && rows[0]) {
        const affectedRowId = rows[0][0].BusnPartnerId;
        response.primaryKeyValue = formData.busnPartnerId || affectedRowId;
        response.success = true;
        response.responseMessage = 'Saved Successfully!';
      }
    } catch (error) {
      console.error('Error executing stored procedure:', error);
      throw error;
    } finally {
      if (connection) {
        //connection.end();
        connection.release();
      }
    }

    return response;
  }

  public async getBusinessPartnerTypesService(FormData: any): Promise<any> {

    return withConnectionDatabase(async (connection: any) => {
      const [rows]: any = await connection.query(`
        SELECT COUNT(*) OVER () as TotalRecords, 
        MTBL.*
        FROM busnpartnertype MTBL
        WHERE MTBL.BusnPartnerTypeId IS NOT NULL
        ORDER BY MTBL.BusnPartnerTypeId DESC
        LIMIT ${FormData.pageNo - 1}, ${FormData.pageSize}
    `);

      const results: any = rows;
      return results;

    });


  }

  public async getSaleRepresentativeDetailOfBusinessPartnerService(busnPartnerId: number): Promise<any> {


    return withConnectionDatabase(async (connection: any) => {
      let result: any = [];
      const [rows]: any = await connection.query(`
        SELECT MTBL.*, BP.FirstName AS representativeFirstName, BP.LastName AS representativeLastName, VENDOR.FirstName AS vendorFirstName, VENDOR.LastName AS vendorLastName
        FROM sales_representative_details MTBL
        INNER JOIN busnpartner BP ON BP.BusnPartnerId = MTBL.business_partner_id
        INNER JOIN busnpartner VENDOR ON VENDOR.BusnPartnerId = MTBL.vendor_id
        WHERE MTBL.business_partner_id = ${busnPartnerId}
    `);

      result = rows[0];
      return result;

    });


  }


}

export default UserService;
