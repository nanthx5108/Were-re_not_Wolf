import sharp from 'sharp';
import fs from 'fs';
import ico from 'png-to-ico';
import path from 'path';

const src = path.resolve(process.cwd(), 'public', 'events', 'Situation-card.png');
const tmp = path.resolve(process.cwd(), 'public', 'favicon-64.png');
const out = path.resolve(process.cwd(), 'public', 'favicon.ico');

(async () => {
  try {
    if (!fs.existsSync(src)) throw new Error('source image not found: ' + src);
    await sharp(src).resize(64,64,{fit:'cover'}).png({compressionLevel:9}).toFile(tmp);
    const buf = await ico([tmp]);
    fs.writeFileSync(out, buf);
    fs.unlinkSync(tmp);
    console.log('favicon.ico generated at', out);
  } catch (e) {
    console.error('favicon generation failed:', e.message);
    process.exit(1);
  }
})();
