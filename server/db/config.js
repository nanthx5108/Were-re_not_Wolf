import dotenv from 'dotenv';

dotenv.config();

export const dbName = process.env.DB_NAME || 'were_not_wolf';

export const connectionConfig = {
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),
  multipleStatements: true,
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
