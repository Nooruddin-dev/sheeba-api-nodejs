


import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();



const connectionPool = mysql.createPool({
  // host: process.env.DB_HOST,
  // user: process.env.DB_USER,
  // password: process.env.DB_PASSWORD,
  // database: process.env.DB_NAME,


  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'sheba_inventory_sys_db',

  // host: 'MYSQL8010.site4now.net',
  // user: 'a8d14f_sheeba',
  // password: '786358Sheeba#',
  // database: 'db_a8d14f_sheeba',
});

export default connectionPool;



