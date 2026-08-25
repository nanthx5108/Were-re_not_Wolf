// รันด้วย: node check-imports.js
// สแกนทุก import/require แบบ relative (./ หรือ ../) ในโฟลเดอร์ client
// เทียบชื่อไฟล์ที่ import กับชื่อไฟล์จริงบนดิสก์แบบสนตัวพิมพ์เล็ก-ใหญ่
// (Linux ที่ Render ใช้สนตัวพิมพ์เล็ก-ใหญ่ ต่าง Windows ที่ไม่สน)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'client');
const EXTS = ['.js', '.jsx', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.wav', '.mp3'];
const SCAN_EXTS = ['.js', '.jsx'];

let problems = 0;

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function resolveWithCase(baseDir, importPath) {
  // ลองเติมนามสกุลถ้ายังไม่มี
  const candidates = importPath.match(/\.\w+$/) ? [importPath] : EXTS.map(ext => importPath + ext);

  for (const candidate of candidates) {
    const target = path.resolve(baseDir, candidate);
    const dir = path.dirname(target);
    const base = path.basename(target);
    if (!fs.existsSync(dir)) continue;

    const actualNames = fs.readdirSync(dir);
    const exactMatch = actualNames.includes(base);
    if (exactMatch) return { ok: true };

    const caseInsensitiveMatch = actualNames.find(n => n.toLowerCase() === base.toLowerCase());
    if (caseInsensitiveMatch) {
      return { ok: false, actual: path.join(path.relative(baseDir, dir), caseInsensitiveMatch).replace(/\\/g, '/') };
    }
  }
  return { ok: false, actual: null };
}

const files = walk(ROOT).filter(f => SCAN_EXTS.includes(path.extname(f)));
const importRegex = /(?:import\s+[^'"]*?from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"](\.[^'"]+)['"]/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const baseDir = path.dirname(file);
  let match;
  importRegex.lastIndex = 0;
  while ((match = importRegex.exec(content))) {
    const importPath = match[1];
    const result = resolveWithCase(baseDir, importPath);
    if (!result.ok) {
      problems++;
      const relFile = path.relative(__dirname, file).replace(/\\/g, '/');
      if (result.actual) {
        console.log(`❌ ${relFile}\n   import: "${importPath}"\n   ไฟล์จริงคือ: "${result.actual}"\n`);
      } else {
        console.log(`⚠️  ${relFile}\n   import: "${importPath}"\n   ไม่พบไฟล์นี้เลยในดิสก์ (อาจจะหายไปจริงๆ ไม่ใช่แค่ case ผิด)\n`);
      }
    }
  }
}

console.log(`\n=== เจอปัญหาทั้งหมด ${problems} จุด ===`);
