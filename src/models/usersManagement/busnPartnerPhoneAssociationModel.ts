export interface busnPartnerPhoneAssociationModel {
    phoneId: number;
    busnPartnerId: number;
    phoneTypeId: number;
    phoneTypeName?: string;
    phoneNo?: string;
    createdOn?: Date;
    createdBy?: number;
    updatedOn?: Date;
    updatedBy?: number;
}
