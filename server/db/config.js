import dotenv from 'dotenv';

dotenv.config();

export const dbName = process.env.DB_NAME || 'were_not_wolf';

/** option ที่ใช้ได้ทั้ง createConnection และ createPool */
export const connectionConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

/** config ของ pool เดิม — เพิ่มเฉพาะ option ที่ createConnection ไม่รู้จัก */
export const poolConfig = {
  ...connectionConfig,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
};

/** ใช้ตอน log ว่ากำลังจะต่อไปที่ไหน — ไม่มี password */
export function describeTarget() {
  const { user, host, port } = connectionConfig;
  return `${user}@${host}:${port}/${dbName}`;
}
