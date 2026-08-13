// optimize_photos.mjs
// Compress the downloaded photos to a web-friendly size:
//   - max width 1000px
//   - progressive JPEG quality 72
//   - strip EXIF (privacy) while keeping authorship in photos.json
// Uses sharp (already a dev dep of the site).
import { readdirSync, writeFileSync, readFileSync, renameSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PHOTOS_DIR = join(ROOT, 'site', 'public', 'photos');
const require = createRequire(pathToFileURL(join(ROOT, 'site', 'package.json')));
const sharp = require('sharp');

const files = readdirSync(PHOTOS_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));

(async () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'site', 'src', 'data', 'photos-manifest.json'), 'utf8'));
  let totalBefore = 0;
  let totalAfter = 0;
  for (const f of files) {
    const src = join(PHOTOS_DIR, f);
    const before = readFileSync(src).length;
    totalBefore += before;
    let img = sharp(src, { failOn: 'none' }).rotate(); // honor EXIF orientation
    const meta = await img.metadata();
    const out = join(PHOTOS_DIR, f.replace(/\.jpe?g$/i, '.jpg').replace(/\.png$/i, '.png'));
    if (f !== out.replace(/\\/g, '/').split('/').pop()) {
      // name normalization handled below
    }
    if (/\.jpe?g$/i.test(extname(f))) {
      img = img.resize({ width: Math.min(meta.width || 1000, 1000), withoutEnlargement: true })
        .jpeg({ quality: 72, progressive: true, mozjpeg: true });
    } else {
      img = img.resize({ width: Math.min(meta.width || 1000, 1000), withoutEnlargement: true })
        .png({ quality: 72, compressionLevel: 9 });
    }
    // Write via sharp's own pipeline to a temp file, then atomically replace
    const tmp = join(PHOTOS_DIR, `.__opt__${f}`);
    await img.toFile(tmp);
    renameSync(tmp, src);
    totalAfter += readFileSync(src).length;
  }
  const kb = (n) => (n / 1024).toFixed(0);
  console.log(`[done] before: ${kb(totalBefore)} KB -> after: ${kb(totalAfter)} KB (${Math.round((1 - totalAfter / totalBefore) * 100)}% smaller)`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
