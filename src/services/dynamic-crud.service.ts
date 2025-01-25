import { PoolConnection } from "mysql2/promise";


export class DynamicCud {
    static async insert<R = number>(
        tableName: string,
        data: Record<string, unknown>,
        connection: PoolConnection,
    ): Promise<{ insertId: R, message: string }> {
        const names: string[] = [];
        const values: unknown[] = [];
        const placeholders: string[] = [];
        for (const [name, value] of Object.entries(data)) {
            if (value !== undefined) {
                names.push(name);
                values.push(value);
                placeholders.push(`:${name}`);
            }
        }

        // Construct the insert query
        let query = `INSERT INTO ${tableName} (${names.join(', ')}) VALUES (${placeholders.join(', ')})`;

        // Replace named placeholders with `?` for execution
        query = query.replace(/:\w+/g, '?');

        // Log the query and values for readability
        console.log('Executing query:', query);
        console.log('With values:', values);

        // Execute the insert query
        const [result]: any = await connection.execute(query, values);

        console.log('Result:', result);

        return { insertId: result.insertId, message: 'Record inserted successfully' };
    }

    static async bulkInsert<R = number>(
        tableName: string,
        data: Record<string, unknown>[],
        connection: PoolConnection
    ): Promise<{ insertIds: R[], message: string }> {
        if (data.length === 0) {
            throw new Error("Data array cannot be empty");
        }

        const columnNames = Object.keys(data[0]);
        const placeholders: string[] = [];
        const values: unknown[] = [];

        // Generate placeholders and values for each row
        data.forEach(row => {
            const rowPlaceholders = columnNames.map(() => '?').join(', ');
            placeholders.push(`(${rowPlaceholders})`);

            columnNames.forEach(column => {
                values.push(row[column]);
            });
        });

        // Construct the bulk insert query
        const query = `
            INSERT INTO ${tableName} (${columnNames.join(', ')})
            VALUES ${placeholders.join(', ')}
        `;

        // Log the query and values for debugging
        console.log('Executing query:', query);
        console.log('With values:', values);

        // Execute the bulk insert query
        const [result]: any = await connection.execute(query, values);

        // Calculate the IDs of all inserted rows
        const insertIds: R[] = [];
        const firstInsertId = result.insertId;
        for (let i = 0; i < data.length; i++) {
            insertIds.push(firstInsertId + i as R);
        }

        return { insertIds, message: 'Records inserted successfully' };
    }

    static async update<P = number, R = any>(
        tableName: string,
        primaryKey: P,
        primaryKeyColumnName: string,
        data: Record<string, unknown>,
        connection: PoolConnection,
    ): Promise<R[]> {
        const names: string[] = [];
        const values: unknown[] = [];
        for (const [name, value] of Object.entries(data)) {
            if (value !== undefined) {
                names.push(name);
                values.push(value);
            }
        }

        // Push primary key value
        values.push(primaryKey);

        // Construct the update query
        let query = `UPDATE ${tableName} SET ${names.map(name => `${name} = ?`).join(', ')} WHERE ${primaryKeyColumnName} = ?`;

        // Replace named placeholders with `?` for execution
        query = query.replace(/:\w+/g, '?');

        // Log the query and values for readability
        console.log('Executing query:', query);
        console.log('With values:', values);

        // Execute the update query
        const [result]: any = await connection.execute(query, values);

        return result;
    }
}