import { IPageBasicDataModel } from "../common/pageBasicDataModel";

export interface busnPartnerAddressAssociationModel extends IPageBasicDataModel {
    addressAsocId: number;
    busnPartnerId: number;
    addressTypeId: number;
    addressTypeName?: string;
    addressOne: string;
    addressTwo?: string;
    countryId: number;
    stateId?: number;
    cityId?: number;
    isActive: boolean;
    createdOn: Date;
    createdBy?: number;
    updatedOn?: Date;
    updatedBy?: number;
}