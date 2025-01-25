export const BusinessPartnerTypesEnum : any = {
    Admin: 1,
    NormalUser: 2,
    Customer: 3,
    Vendor: 4,
    SalesRepresentative: 5
  };

  export enum UnitTypesEnum {
    Liquid_Solvent = '1',
    Granules = '2',
    Roll = '3',
  }
  

  export enum PurchaseOrderStatusTypesEnum {
    Pending = 1,
    Complete = 2,
    Cancel = 3,
    Approve = 4,
  }

  export enum ProductionEntriesTypesEnum {
    NewProductEntry = "NewProductEntry",
    NewGRN = "NewGRN",
    NewProductionEntry = "NewProductionEntry",
    EditProductionEntry = "EditProductionEntry",
  }

  export enum ProductSourceEnum {
    External = 'External',
    Internal = 'Internal'
  }

  export enum ProductionEntryProductUsageType {
    Consumed = 'Consumed',
    Produced = 'Produced'
  }
  



