

export type ColumnValueDynamic = string | number | boolean | Date | null;

export interface InsertUpdateDynamicColumnMap {
    [column: string]: ColumnValueDynamic;
}