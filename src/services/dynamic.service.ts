import { connectionPool, withConnectionDatabase } from "../configurations/db";
import { ServiceResponseInterface } from "../models/common/ServiceResponseInterface";
import { ColumnValueDynamic, InsertUpdateDynamicColumnMap } from "../models/dynamic/InsertUpdateDynamicColumnMap";

export async function dynamicDataInsertService(
    tableName: string,
    primaryKeyName: string,
    primaryKeyValue: number | string | null,
    isAutoIncremented: boolean,
    columns: InsertUpdateDynamicColumnMap
): Promise<ServiceResponseInterface> {

    return withConnectionDatabase(async (connection: any) => {
        let response: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        let columnNames: string[] = [];
        let columnValues: ColumnValueDynamic[] = [];
        let placeholders: string[] = [];

        for (const [key, value] of Object.entries(columns)) {
            if (value !== undefined) {
                columnNames.push(key);
                columnValues.push(value);
                placeholders.push(`:${key}`);
            }
        }

        // Construct the insert query
        let insertQuery = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders.join(', ')})`;

        // Log the query and values for readability
        console.log('Executing query:', insertQuery);
        console.log('With values:', columnValues);

        // Replace named placeholders with `?` for execution
        insertQuery = insertQuery.replace(/:\w+/g, '?');

        // Execute the insert query
        const [result]: any = await connection.execute(insertQuery, columnValues);

        // Retrieve the last inserted ID if auto-incremented, otherwise return the provided primary key value
        const insertedId = isAutoIncremented ? result.insertId : primaryKeyValue;

        response.success = true;
        response.primaryKeyValue = insertedId;
        response.responseMessage = 'Saved Successfully!'
        return response;

    });

}

export async function dynamicDataUpdateService(
    tableName: string,
    primaryKeyName: string,
    primaryKeyValue: string | number,
    columnsToUpdate: InsertUpdateDynamicColumnMap
): Promise<ServiceResponseInterface> {

    return withConnectionDatabase(async (connection: any) => {
        let response: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        let updateSetClauses: string[] = [];
        let updateValues: ColumnValueDynamic[] = [];

        for (const [key, value] of Object.entries(columnsToUpdate)) {
            if (value !== undefined) {
                updateSetClauses.push(`${key} = ?`);
                updateValues.push(value);
            }
        }

        // Construct the update query
        let updateQuery = `UPDATE ${tableName} SET ${updateSetClauses.join(', ')} WHERE ${primaryKeyName} = ?`;

        // Log the query and values for readability
        console.log('Executing query:', updateQuery);
        console.log('With values:', updateValues.concat(primaryKeyValue));

        // Execute the update query
        const [result]: any = await connection.execute(updateQuery, updateValues.concat(primaryKeyValue));

        if (result.affectedRows > 0) {
            response.success = true;
            response.primaryKeyValue = primaryKeyValue;
            response.responseMessage = 'Updated Successfully!';
        } else {
            response.responseMessage = 'No rows were updated!';
        }

        return response;

    });


}


export async function dynamicDataGetService(
    tableName: string,
    primaryKeyName: string,
    primaryKeyValue: string | number | any
): Promise<ServiceResponseInterface> {


    return withConnectionDatabase(async (connection: any) => {
        let response: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        // Construct the select query
        const selectQuery = `SELECT * FROM ${tableName} WHERE ${primaryKeyName} = '${primaryKeyValue}' LIMIT 1`;

        // Log the query for readability
        console.log('Executing query:', selectQuery);
        console.log('With primary key value:', primaryKeyValue);

        // Execute the select query
        const [rows]: any = await connection.execute(selectQuery);

        if (rows.length > 0) {
            response.success = true;
            response.primaryKeyValue = primaryKeyValue;
            response.responseMessage = 'Retrieved Successfully!';
            response.data = rows[0]; // Assuming you want to return the first row as data
        } else {
            response.responseMessage = 'No rows found!';
        }

        return response;

    });

}

//--get record by any column from any table
export async function dynamicDataGetByAnyColumnService(
    tableName: string,
    columnName: string,
    columnValue: string | number | any
): Promise<ServiceResponseInterface> {
    
    
    return withConnectionDatabase(async (connection: any) => {
        let response: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        // Construct the select query
        const selectQuery = `SELECT * FROM ${tableName} WHERE ${columnName} = '${columnValue}' LIMIT 100`;

        // Log the query for readability
        console.log('Executing query:', selectQuery);
        console.log('With primary key value:', columnValue);

        // Execute the select query
        const [rows]: any = await connection.execute(selectQuery);

        if (rows.length > 0) {
            response.success = true;
            response.primaryKeyValue = columnValue;
            response.responseMessage = 'Retrieved Successfully!';
            response.data = rows;
        } else {
            response.responseMessage = 'No rows found!';
        }

        return response;
 
    });

    
}