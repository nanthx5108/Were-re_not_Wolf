import fs from 'fs';
import path from 'path';
import mysql, { escapeId } from 'mysql2/promise';
import dotenv from 'dotenv';
import { migrateLeveling } from './migrateLeveling.js';

dotenv.config();

const dbName = process.env.DB_NAME || 'were_not_wolf';
const dbConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  multipleStatements: true,
};

const pool = mysql.createPool({
  ...dbConfig,
  database: dbName,
});

async function initializeDatabase() {
  const initConnection = await mysql.createConnection({ ...dbConfig });

  try {
    await initConnection.query(
      `CREATE DATABASE IF NOT EXISTS ${escapeId(dbName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    const schemaPath = path.resolve(process.cwd(), 'db/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await initConnection.query(schemaSql);
    }

    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    if (rows?.[0]?.result === 2) {
      console.log('✅ MySQL connected and schema ready');
    }

    await migrateLeveling(pool);
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  } finally {
    await initConnection.end();
  }
}

await initializeDatabase();

export default pool;