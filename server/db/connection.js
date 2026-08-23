import mysql, { escapeId } from 'mysql2/promise';
import { poolConfig, connectionConfig, dbName, describeTarget } from './config.js';
import { runSchema } from './runSchema.js';
import { migrateLeveling } from './migrateLeveling.js';

const argvString = process.argv.join(' ');
const isTestRuntime = process.env.NODE_ENV === 'test'
  || argvString.includes('--test')
  || argvString.includes('--experimental-test-module-mocks')
  || argvString.includes('.test.js');

const stubPool = {
  query: async () => [[], []],
  execute: async () => [[], []],
  end: async () => {},
};

const pool = isTestRuntime ? stubPool : mysql.createPool({
  ...poolConfig,
  database: dbName,
});

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({ ...connectionConfig });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${escapeId(dbName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } catch (err) {
    const accessDenied = err.errno === 1044 || err.errno === 1045;
    if (!accessDenied) throw err;
    console.warn(`⚠️  ไม่มีสิทธิ์ CREATE DATABASE — ถือว่า "${dbName}" ถูกสร้างไว้บน host แล้ว`);
  } finally {
    await connection.end();
  }
}

async function initializeDatabase() {
  try {
    await ensureDatabaseExists();
    await runSchema(pool);

    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    if (rows?.[0]?.result === 2) {
      console.log(`✅ MySQL connected and schema ready — ${describeTarget()}`);
    }

    await migrateLeveling(pool);
  } catch (err) {
    console.error(`❌ MySQL connection failed (${describeTarget()}):`, err.message);
    process.exit(1);
  }
}

if (!isTestRuntime) {
  await initializeDatabase();
}

export default pool;
