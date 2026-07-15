/**
 * สร้าง/อัปเดตตารางทั้งหมดจาก db/schema.sql — รันแยกจาก server
 *
 *   npm run db:migrate          # ใช้ค่าจาก server/.env
 *
 * ใช้ connection config ชุดเดียวกับ server (db/config.js)
 * รันซ้ำได้ปลอดภัย — statement ที่ถูก apply ไปแล้วจะถูกข้าม
 */
import mysql, { escapeId } from 'mysql2/promise';
import { connectionConfig, dbName, describeTarget } from './config.js';
import { runSchema } from './runSchema.js';
import { migrateLeveling } from './migrateLeveling.js';

async function migrate() {
  console.log(`🔌 connecting to ${describeTarget()}`);

  // connect แบบยังไม่เลือก database ก่อน เผื่อ database ยังไม่ถูกสร้าง
  const bootstrap = await mysql.createConnection({ ...connectionConfig });
  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS ${escapeId(dbName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`📦 database "${dbName}" พร้อมใช้งาน`);
  } catch (err) {
    if (err.errno !== 1044 && err.errno !== 1045) throw err;
    // managed host บางเจ้า user ไม่มีสิทธิ์ CREATE DATABASE — ต้องสร้างจาก console ของ host เอง
    console.warn(`⚠️  ไม่มีสิทธิ์ CREATE DATABASE — ถือว่า "${dbName}" ถูกสร้างไว้บน host แล้ว`);
  } finally {
    await bootstrap.end();
  }

  const connection = await mysql.createConnection({ ...connectionConfig, database: dbName });
  try {
    const { applied, skipped, total } = await runSchema(connection);
    console.log(`🗂️  schema: ${applied} statement ถูกรัน, ${skipped} ถูกข้าม (มีอยู่แล้ว) จาก ${total}`);

    await migrateLeveling(connection);

    const [tables] = await connection.query('SHOW TABLES');
    const names = tables.map((row) => Object.values(row)[0]);
    console.log(`✅ migrate สำเร็จ — ตารางใน "${dbName}": ${names.join(', ') || '(ไม่มี)'}`);
  } finally {
    await connection.end();
  }
}

try {
  await migrate();
  process.exit(0);
} catch (err) {
  console.error(`❌ migrate ล้มเหลว (${describeTarget()})`);
  console.error(`   [${err.code ?? 'ERROR'}] ${err.message}`);
  process.exit(1);
}
