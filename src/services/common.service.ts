import { withConnectionDatabase } from "../configurations/db";
import { stringIsNullOrWhiteSpace } from "../utils/commonHelpers/ValidationHelper";




export async function getProductQuantityFromLedger(productId: number): Promise<any> {

    return withConnectionDatabase(async (connection: any) => {

        const [results]: any = await connection.query(`
            SELECT SUM(quantity) AS total_quantity
            FROM inventory_ledger MTBL
         
            WHERE MTBL.productid = ${productId} 
          
        `);

        if (results?.length > 0) {
            return results[0];
        } else {
            return null;
        }

    });
}

export async function getProductWeightValueFromLedger(productId: number): Promise<any> {

    return withConnectionDatabase(async (connection: any) => {

        const [results]: any = await connection.query(`
            SELECT SUM(weight_quantity_value) AS total_weight_quantity
            FROM inventory_ledger MTBL
         
            WHERE MTBL.productid = ${productId} 
        `);

        if (results?.length > 0) {
            return results[0];
        } else {
            return null;
        }
    });
}


export async function getWeightAndQtyFromLedger(productId: number, connection: any): Promise<any> {
    const [results]: any = await connection.query(`
            select
                sum(quantity) as total_quantity,
                sum(weight_quantity_value) as total_weight_quantity
            from
                inventory_ledger il
            where
                il.productid = ?;`
        , productId);

    if (results?.length > 0) {
        return results[0];
    } else {
        return null;
    };
}