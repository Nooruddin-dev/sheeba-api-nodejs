


import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const connectionPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '8001', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  // host: 'localhost',
  // user: 'root',
  // password: '123456',
  // database: 'sheba_inventory_sys_db',
});

export async function withConnectionDatabase(fn: any) {
  const connection = await connectionPool.getConnection();
  try {
    return await fn(connection);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    if (connection) {
      if (typeof connection.release === 'function') {
        await connection.release();
      } else if (typeof connection.end === 'function') {
        await connection.end();
      }

    }

  }
}




