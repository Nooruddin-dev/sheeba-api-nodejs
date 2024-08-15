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