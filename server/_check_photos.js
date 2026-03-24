import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'root',
  database: 'shimmer'
});

const [rows] = await pool.query('SELECT id, title, url, is_visible FROM photos');
console.log(JSON.stringify(rows, null, 2));
await pool.end();
