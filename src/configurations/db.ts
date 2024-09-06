


import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();



export const connectionPool = mysql.createPool({
  // host: process.env.DB_HOST,
  // user: process.env.DB_USER,
  // password: process.env.DB_PASSWORD,
  // database: process.env.DB_NAME,


  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'sheba_inventory_sys_db',

  // host: 'localhost',
  // user: 'admin',
  // port: 8001,
  // password: 'wTVCUKxNYkRcUgM776T6',
  // database: 'sheeba',


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

      // connection.release();

      if (typeof connection.release === 'function') {
        await connection.release();
      } else if (typeof connection.end === 'function') {
        await connection.end();
      }

    }

  }
}




