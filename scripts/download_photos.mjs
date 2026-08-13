// download_photos.mjs
// Download the chosen Wikimedia Commons thumbnails to site/public/photos/<id>.<ext>
// and strip the utm_* tracking params from URLs. Wikimedia allows this for
// licensed files; keep the license + artist in photos.json for attribution.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'site', 'public', 'photos');
const require = createRequire(pathToFileURL(join(ROOT, 'site', 'package.json')));

const UA = 'SeichiAtlas/0.2 (contact@seichiatlas.com; photo download pipeline)';

const photos = JSON.parse(readFileSync(join(ROOT, 'site', 'src', 'data', 'photos.json'), 'utf8'));
mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const manifest = {};
  let ok = 0;
  for (const [id, p] of Object.entries(photos)) {
    let url = p.url;
    // Remove utm params
    url = url.split('?')[0];
    const ext = (extname(new URL(url).pathname) || '.jpg').toLowerCase().replace('.jpeg', '.jpg');
    const dest = join(OUT_DIR, `${id}${ext}`);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (!res.ok) { console.warn(`  skip ${id}: HTTP ${res.status}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(dest, buf);
      manifest[id] = { file: `/photos/${id}${ext}`, ext, bytes: buf.length };
      ok++;
    } catch (e) {
      console.warn(`  fail ${id}: ${e.message}`);
    }
    await sleep(1000);
  }
  writeFileSync(join(ROOT, 'site', 'src', 'data', 'photos-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`[done] downloaded ${ok}/${Object.keys(photos).length} to site/public/photos/`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
