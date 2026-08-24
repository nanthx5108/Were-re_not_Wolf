import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Load environment variables with a safe local override for development.
// Priority (non-production): server/.env.local -> .env.local (project root) -> .env
// In production (e.g. Render) we load the default .env from environment or Render's env vars.
const serverLocal = path.resolve(process.cwd(), 'server', '.env.local');
const rootLocal = path.resolve(process.cwd(), '.env.local');
if (process.env.NODE_ENV !== 'production') {
  if (fs.existsSync(serverLocal)) {
    dotenv.config({ path: serverLocal });
  } else if (fs.existsSync(rootLocal)) {
    dotenv.config({ path: rootLocal });
  } else {
    dotenv.config();
  }
} else {
  // Production: rely on real environment variables (Render) or .env if present
  dotenv.config();
}

export const dbName = process.env.DB_NAME || 'were_not_wolf';

// Read env and accept several truthy values for DB_SSL (true/1/yes)
const DB_SSL_RAW = (process.env.DB_SSL || '').toString().toLowerCase();
const USE_DB_SSL = ['1', 'true', 'yes'].includes(DB_SSL_RAW);

// Support loading a CA either from a filesystem path or from a base64-encoded
// env var. When a CA is provided we enable full verification (rejectUnauthorized: true).
const DB_SSL_CA_PATH = process.env.DB_SSL_CA_PATH || '';
const DB_SSL_CA_B64 = process.env.DB_SSL_CA_B64 || '';

let sslObject = null;
if (USE_DB_SSL) {
  if (DB_SSL_CA_B64) {
    try {
      const pem = Buffer.from(DB_SSL_CA_B64, 'base64').toString('utf8');
      sslObject = { ca: pem, rejectUnauthorized: true };
    } catch (err) {
      console.warn('Invalid DB_SSL_CA_B64 — falling back to unverified SSL (rejectUnauthorized:false)');
      sslObject = { rejectUnauthorized: false };
    }
  } else if (DB_SSL_CA_PATH) {
    try {
      const pem = fs.readFileSync(DB_SSL_CA_PATH, 'utf8');
      sslObject = { ca: pem, rejectUnauthorized: true };
    } catch (err) {
      console.warn(`Failed to read DB_SSL_CA_PATH (${DB_SSL_CA_PATH}) — falling back to unverified SSL`);
      sslObject = { rejectUnauthorized: false };
    }
  } else {
    // No CA provided — allow unverified SSL for hosts that don't provide a CA bundle
    sslObject = { rejectUnauthorized: false };
  }
}

export const connectionConfig = {
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),
  multipleStatements: true,
  // Include ssl settings only when requested
  ...(USE_DB_SSL && sslObject ? { ssl: sslObject } : {}),
};

export const poolConfig = {
  ...connectionConfig,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
};

export function describeTarget() {
  const { user, host, port } = connectionConfig;
  return `${user}@${host}:${port}/${dbName}`;
}