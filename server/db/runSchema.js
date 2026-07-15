import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');

/**
 * error ที่แปลว่า "statement นี้ถูก apply ไปแล้ว" — ข้ามได้ ไม่ใช่ความล้มเหลว
 * นี่คือสิ่งที่ทำให้ schema.sql รันซ้ำได้ทุกครั้งที่ server start โดยไม่ต้องพึ่ง
 * `ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` ซึ่งเป็น syntax ของ MariaDB
 * และเป็น syntax error บน MySQL 8
 */
const ALREADY_APPLIED = new Set([
  1007, // ER_DB_CREATE_EXISTS
  1050, // ER_TABLE_EXISTS_ERROR
  1060, // ER_DUP_FIELDNAME    — ADD COLUMN ที่มีอยู่แล้ว
  1061, // ER_DUP_KEYNAME      — CREATE INDEX ที่มีอยู่แล้ว
]);

/**
 * แยก schema.sql เป็น statement ทีละอัน (mysql2 ส่งทีละ statement ได้แม่นกว่ายัดก้อนเดียว
 * เพราะเราต้องดู error code ของแต่ละ statement)
 */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let quote = null;
  let inLineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        current += char;
      }
      continue;
    }

    if (!quote && char === '-' && next === '-') {
      inLineComment = true;
      i++;
      continue;
    }

    if (quote) {
      current += char;
      if (char === '\\') {
        current += next ?? '';
        i++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      current += char;
      continue;
    }

    if (char === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

/**
 * รัน schema.sql กับ connection/pool ที่เลือก database ไว้แล้ว
 * ใช้ร่วมกันระหว่างตอน server boot (connection.js) และ `npm run db:migrate`
 */
export async function runSchema(connection) {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const statements = splitStatements(sql);

  let applied = 0;
  let skipped = 0;

  for (const statement of statements) {
    try {
      await connection.query(statement);
      applied++;
    } catch (err) {
      if (ALREADY_APPLIED.has(err.errno)) {
        skipped++;
        continue;
      }
      const firstLine = statement.split('\n')[0];
      throw new Error(`schema statement failed [${err.code}]: ${firstLine} …\n   ${err.message}`);
    }
  }

  return { applied, skipped, total: statements.length };
}
