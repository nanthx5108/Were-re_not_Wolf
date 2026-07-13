import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const dbName = process.env.DB_NAME || 'were_not_wolf';

/**
 * DB_CA_CERT รับได้ 2 แบบ:
 *  - path ไปยังไฟล์ ca.pem ที่โหลดจาก Aiven Console (เช่น DB_CA_CERT=db/ca.pem)
 *  - เนื้อ PEM ตรง ๆ สำหรับ host ที่ตั้ง env เป็นข้อความได้เท่านั้น
 *    ("\n" ที่เป็นตัวอักษรสองตัวจะถูกแปลงกลับเป็นขึ้นบรรทัดใหม่ให้)
 */
function readCaCert() {
  const raw = process.env.DB_CA_CERT?.trim();
  if (!raw) return undefined;

  if (raw.includes('BEGIN CERTIFICATE')) return raw.replace(/\\n/g, '\n');

  const caPath = path.resolve(process.cwd(), raw);
  try {
    return fs.readFileSync(caPath, 'utf8');
  } catch {
    throw new Error(
      `DB_CA_CERT อ่านไฟล์ไม่ได้: ${caPath}\n` +
      '   โหลด ca.pem จาก Aiven Console > Overview > CA Certificate แล้วชี้ path ให้ถูก ' +
      '(relative path นับจาก server/) หรือ paste เนื้อ PEM ลง DB_CA_CERT ตรง ๆ'
    );
  }
}

/**
 * local MySQL/MariaDB ไม่ได้เปิด TLS → ต้องส่ง ssl: undefined ไม่งั้น handshake พัง
 * Aiven บังคับ TLS และใช้ certificate ที่เซ็นด้วย CA ของ project เอง (ไม่ใช่ CA สาธารณะ)
 * ดังนั้น rejectUnauthorized: true เฉย ๆ จะ error "self-signed certificate in certificate chain"
 * ต้องชี้ DB_CA_CERT ไปที่ ca.pem ของ service ด้วย
 */
function buildSslConfig() {
  if (process.env.DB_SSL !== 'true') return undefined;

  const ca = readCaCert();
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true };
}

/** option ที่ใช้ได้ทั้ง createConnection และ createPool */
export const connectionConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  ssl:      buildSslConfig(),
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
  const { user, host, port, ssl } = connectionConfig;
  return `${user}@${host}:${port}/${dbName} (SSL: ${ssl ? 'on' : 'off'})`;
}
