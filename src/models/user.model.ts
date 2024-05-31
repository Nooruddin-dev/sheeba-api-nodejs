import { busnPartnerAddressAssociationModel } from "./usersManagement/busnPartnerAddressAssociationModel";
import { busnPartnerPhoneAssociationModel } from "./usersManagement/busnPartnerPhoneAssociationModel";

export interface UserEntity {
    busnPartnerId: number,
    firstName: string;
    middleName: string;
    lastName: string;
    userName: string;
    emailAddress: string;
    password: string;
    isActive: number;
    isVerified: number;
    verificationCode: string;
    countryId: number;
    createdOn: string;
    createdBy: number | null;
    updatedOn: string | null;
    updatedBy: number | null;
    profilePictureId: number | null;
    isWalkThroughCustomer: number;
    profilePictureUrl: string | null;

    busnPartnerAddressAssociationBusnPartners?: busnPartnerAddressAssociationModel[];
    busnPartnerPhoneAssociation?: busnPartnerPhoneAssociationModel[];
   
}