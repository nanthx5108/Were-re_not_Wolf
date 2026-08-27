import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');

const ALREADY_APPLIED = new Set([
  1007, // ER_DB_CREATE_EXISTS
  1050, // ER_TABLE_EXISTS_ERROR
  1060, // ER_DUP_FIELDNAME    — ADD COLUMN ที่มีอยู่แล้ว
  1061, // ER_DUP_KEYNAME      — CREATE INDEX ที่มีอยู่แล้ว
]);

const ENGINE_TABLE_ERROR = 'doesn\'t exist in engine';

function extractTableName(statement) {
  const normalized = statement.trim().replace(/\s+/g, ' ');
  const createTableMatch = normalized.match(/CREATE TABLE(?: IF NOT EXISTS)? [`"]?(?:[^`".]+\.)?`?([^`"\s(]+)`?/i);
  if (createTableMatch) return createTableMatch[1];

  const alterTableMatch = normalized.match(/ALTER TABLE [`"]?(?:[^`".]+\.)?`?([^`"\s(]+)`?/i);
  if (alterTableMatch) return alterTableMatch[1];

  const createIndexMatch = normalized.match(/CREATE INDEX .* ON [`"]?(?:[^`".]+\.)?`?([^`"\s(]+)`?/i);
  if (createIndexMatch) return createIndexMatch[1];

  return null;
}

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

export async function runSchema(connection, recoveredTables = new Set()) {
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

      const tableName = extractTableName(statement);
      if (tableName && err.message?.includes(ENGINE_TABLE_ERROR)) {
        if (recoveredTables.has(tableName)) {
          const firstLine = statement.split('\n')[0];
          throw new Error(`schema statement failed after recovery [${err.code}]: ${firstLine} …\n   ${err.message}`);
        }

        console.warn(`⚠️  Found orphaned metadata for table ${tableName}; attempting recovery.`);
        await connection.query('DROP TABLE IF EXISTS `' + tableName + '`');
        recoveredTables.add(tableName);
        return runSchema(connection, recoveredTables);
      }

      const firstLine = statement.split('\n')[0];
      throw new Error(`schema statement failed [${err.code}]: ${firstLine} …\n   ${err.message}`);
    }
  }

  await connection.query(
    `INSERT INTO news (title, content, tag, author_username, created_at)
     SELECT ?, ?, ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = ?)`,
    [
      'Demo Version 0.1.1',
      '27 สิงหาคม 2026\n\n✨ เพิ่มระบบ\n- เพิ่ม Animation ภายในเกม\n- เพิ่ม Animation สำหรับการเปลี่ยนช่วงเวลากลางวันและกลางคืน\n- เพิ่ม Animation เมื่อเริ่มเกม\n- เพิ่ม Animation สำหรับการโหวตและการประกาศผล\n- เพิ่ม Animation สำหรับการเข้า-ออกห้องและการเปลี่ยนสถานะ Ready\n- เพิ่ม Animation สำหรับ Popup, Modal และ Notification\n- เพิ่ม Micro-interaction สำหรับปุ่มและองค์ประกอบต่าง ๆ ของ UI\n- เพิ่ม Loading Animation ระหว่างการโหลดข้อมูลและเริ่มเกม\n\n🛠 ปรับปรุง\n- ปรับปรุงความลื่นไหลของ UI ภายในเกม\n- ปรับปรุง Transition ระหว่างหน้าต่างและสถานะต่าง ๆ\n- ปรับแต่ง Visual Effects ให้เข้ากับธีม Dark / Mystery\n- ปรับปรุงการตอบสนองขององค์ประกอบ UI\n- ปรับปรุงประสิทธิภาพ Animation สำหรับ Desktop และ Mobile\n\n🚧 กำลังพัฒนา\n- บทบาทใหม่\n- ระบบบันทึกประวัติการเล่น\n- ระบบตั้งค่าห้อง\n- เอฟเฟกต์และแอนิเมชันเพิ่มเติม\n- การปรับปรุงประสิทธิภาพและความเสถียรอย่างต่อเนื่อง',
      'อัปเดต', 'system', '2026-08-27 00:00:00', 'Demo Version 0.1.1',
    ]
  );

  try {
    const [userRows] = await connection.query("SELECT id FROM users WHERE email = 'blaztx5108@gmail.com' LIMIT 1");
    if (userRows.length > 0) {
      await connection.query("INSERT IGNORE INTO admins (user_id) VALUES (?)", [userRows[0].id]);
      console.log('🔑 Initial admin user provisioned.');
    }
  } catch (err) {
    console.warn('Could not provision initial admin:', err.message);
  }

  return { applied, skipped, total: statements.length };
}
