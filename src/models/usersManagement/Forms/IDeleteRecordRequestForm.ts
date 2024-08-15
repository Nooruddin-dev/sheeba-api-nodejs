export interface IDeleteRecordRequestForm {
    entityName?: string;
    entityColumnName: string;
    entityRowId: number;
   
    sqlDeleteTypeId?: number;
}