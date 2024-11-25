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


//--Below is the latest function to handle begin transaction, commit transaction
export async function dynamicDataInsertServiceNew(
    tableName: string,
    primaryKeyName: string,
    primaryKeyValue: number | string | null,
    isAutoIncremented: boolean,
    columns: InsertUpdateDynamicColumnMap,
    connection: any
): Promise<ServiceResponseInterface> {
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

    let insertQuery = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders.join(', ')})`;

    console.log('Executing query:', insertQuery);
    console.log('With values:', columnValues);

    insertQuery = insertQuery.replace(/:\w+/g, '?');

    const [result]: any = await connection.execute(insertQuery, columnValues);

    const insertedId = isAutoIncremented ? result.insertId : primaryKeyValue;

    response.success = true;
    response.primaryKeyValue = insertedId;
    response.responseMessage = 'Saved Successfully!';
    return response;
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

export async function dynamicDataUpdateServiceWithConnection(
    tableName: string,
    primaryKeyName: string,
    primaryKeyValue: string | number,
    columnsToUpdate: InsertUpdateDynamicColumnMap,
    connection: any // Pass connection explicitly
): Promise<ServiceResponseInterface> {
    let response: ServiceResponseInterface = {
        success: false,
        responseMessage: '',
        primaryKeyValue: null
    };

    try {
        let updateSetClauses: string[] = [];
        let updateValues: any[] = [];

        // Construct the SET clause dynamically
        for (const [key, value] of Object.entries(columnsToUpdate)) {
            if (value !== undefined) {
                updateSetClauses.push(`${key} = ?`);
                updateValues.push(value);
            }
        }

        // Construct the update query
        const updateQuery = `UPDATE ${tableName} SET ${updateSetClauses.join(', ')} WHERE ${primaryKeyName} = ?`;

        // Append primaryKeyValue for the WHERE clause
        updateValues.push(primaryKeyValue);

        // Log the query and values for readability
        console.log('Executing query:', updateQuery);
        console.log('With values:', updateValues);

        // Execute the update query
        const [result]: any = await connection.execute(updateQuery, updateValues);

        if (result.affectedRows > 0) {
            response.success = true;
            response.primaryKeyValue = primaryKeyValue;
            response.responseMessage = 'Updated Successfully!';
        } else {
            response.responseMessage = 'No rows were updated!';
        }
    } catch (error) {
        console.error('Error executing update query:', error);
        response.responseMessage = 'Error occurred during the update operation!';
        throw error; // Rethrow error to handle transaction rollback at higher level
    }

    return response;
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

export async function dynamicDataGetServiceWithConnection(
    tableName: string,
    primaryKeyName: string,
    primaryKeyValue: string | number | any,
    connection: any // Pass connection explicitly
): Promise<ServiceResponseInterface> {

    let response: ServiceResponseInterface = {
        success: false,
        responseMessage: '',
        primaryKeyValue: null
    };

    try {
        // Construct the select query
        const selectQuery = `SELECT * FROM ${tableName} WHERE ${primaryKeyName} = ? LIMIT 1`;

        // Log the query for readability
        console.log('Executing query:', selectQuery);
        console.log('With primary key value:', primaryKeyValue);

        // Execute the select query
        const [rows]: any = await connection.execute(selectQuery, [primaryKeyValue]);

        if (rows.length > 0) {
            response.success = true;
            response.primaryKeyValue = primaryKeyValue;
            response.responseMessage = 'Retrieved Successfully!';
            response.data = rows[0]; // Assuming you want to return the first row as data
        } else {
            response.responseMessage = 'No rows found!';
        }
    } catch (error) {
        console.error('Error executing select query:', error);
        response.responseMessage = 'Error occurred during data retrieval!';
        throw error; // Rethrow error to handle transaction rollback at higher level
    }

    return response;
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


// Delete any record
export async function dynamicDataDeleteService(
    entityName: string,
    entityColumnName: string,
    entityRowId: string | number
): Promise<ServiceResponseInterface> {

    return withConnectionDatabase(async (connection: any) => {
        let response: ServiceResponseInterface = {
            success: false,
            responseMessage: '',
            primaryKeyValue: null
        };

        // Construct the delete query
        const deleteQuery = `DELETE FROM ${entityName} WHERE ${entityColumnName} = ?`;

        // Log the query for readability
        console.log('Executing query:', deleteQuery);
        console.log('With primary key value:', entityRowId);

        // Execute the delete query
        const [result]: any = await connection.execute(deleteQuery, [entityRowId]);

        if (result.affectedRows > 0) {
            response.success = true;
            response.primaryKeyValue = entityRowId;
            response.responseMessage = 'Deleted Successfully!';
        } else {
            response.responseMessage = 'No rows were deleted!';
        }

        return response;

    });

}