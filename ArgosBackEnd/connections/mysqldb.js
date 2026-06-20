// connections/mysqldb.js  (ESM)
import 'dotenv/config';
import mysql from 'mysql2';

const dbHost = process.env.DBHOST ?? '100.117.125.146';
const dbUser = process.env.DBUSER ?? 'root';
const dbPass = process.env.DBPASS ?? '';
const dbDB   = process.env.DBDB   ?? 'ozcab_db';
const dbPort = Number(process.env.DBPORT ?? 3306);

const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPass,
  database: dbDB,
  port: dbPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // DATE/DATETIME/TIMESTAMP columns are returned as plain 'YYYY-MM-DD[ HH:MM:SS]'
  // strings instead of JS Date objects. Date objects get serialized through
  // toISOString() (UTC), which silently shifts the calendar day depending on
  // the server/browser timezone offset. Keeping them as raw strings avoids
  // any timezone math for values that are timezone-less by definition.
  dateStrings: true,
});

// Logs útiles del pool base (no-promesa)
pool.on('connection', () => console.log('[MySQL] nueva conexión del pool'));
pool.on('error', (err) => console.error('[MySQL pool error]', err));

// Exporta la versión con promesas (compatible con: const [rows] = await db.query(...))
const promisePool = pool.promise();
export default promisePool;
