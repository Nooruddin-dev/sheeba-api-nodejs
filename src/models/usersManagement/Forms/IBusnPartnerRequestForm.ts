export interface IBusnPartnerRequestForm {
    busnPartnerId?: number;
    busnPartnerTypeId: number;
    firstName: string;
    lastName: string;
    emailAddress: string;
    role_type: string;
    isActive: boolean;
    isVerified?: boolean;
    countryId?: number;
    addressOne?: string;
    phoneNo?: string;
    password: string;
    profilePictureId?: number;
    createByUserId?: number;
    
    saleRepresentativeVendorId?: number;
}