import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDirs = ['events','luck','roles','assets'];
const root = path.resolve(process.cwd(), 'public');

async function processFile(filePath) {
  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.size < 300 * 1024) return; // skip small files

    const ext = path.extname(filePath).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) return;

    const img = sharp(filePath);
    const meta = await img.metadata();
    const maxWidth = 1200;
    let resized = img;
    if (meta.width && meta.width > maxWidth) {
      resized = img.resize({ width: maxWidth });
    }

    if (meta.hasAlpha) {
      // keep PNG for alpha but compress
      await resized.png({ compressionLevel: 9, quality: 80 }).toFile(filePath + '.opt');
    } else {
      // convert to JPEG for smaller size and replace original
      await resized.jpeg({ quality: 80 }).toFile(filePath + '.opt');
    }

    // replace original
    await fs.promises.rename(filePath + '.opt', filePath);
    console.log('Optimized', filePath, '->', (await fs.promises.stat(filePath)).size);
  } catch (e) {
    console.error('Failed to process', filePath, e.message);
  }
}

async function walkAndOptimize() {
  for (const dir of publicDirs) {
    const dirPath = path.join(root, dir);
    if (!fs.existsSync(dirPath)) continue;
    const files = await fs.promises.readdir(dirPath);
    for (const f of files) {
      const full = path.join(dirPath, f);
      const stat = await fs.promises.stat(full);
      if (stat.isFile()) await processFile(full);
      else if (stat.isDirectory()) {
        const subfiles = await fs.promises.readdir(full);
        for (const sf of subfiles) {
          await processFile(path.join(full, sf));
        }
      }
    }
  }
}

walkAndOptimize().then(() => console.log('Done')).catch(err => console.error(err));
