// fetch_photos.mjs
// For every location in data/locations.yaml, find a licensed photo on
// Wikimedia Commons (search + license check, JPEG/PNG only, allowed licenses
// only), and write the result to site/src/data/photos.json.
//
// External-manner rules (docs/40_legal.md + article-material-research):
//   - 1 request / 1.5s minimum
//   - descriptive User-Agent
//   - fetch each candidate's license before adopting
//   - only CC0 / CC BY / CC BY-SA / Public domain are accepted

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const OUT_DIR = join(ROOT, 'site', 'src', 'data');
const require = createRequire(pathToFileURL(join(ROOT, 'site', 'package.json')));
const yaml = require('js-yaml');

const UA = 'SeichiAtlas/0.2 (contact@seichiatlas.com; photo research pipeline)';
const API = 'https://commons.wikimedia.org/w/api.php';
const ALLOWED = /^(CC0|CC BY(?:-[A-Z0-9 ]+)?\d|Public domain|Public Domain)/;
const ALLOWED_SIMPLE = ['cc0', 'cc by', 'cc by-sa', 'public domain'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadLocations() {
  const raw = readFileSync(join(DATA_DIR, 'locations.yaml'), 'utf8');
  return yaml.load(raw);
}

async function commons(params, tries = 2) {
  const qs = new URLSearchParams({ format: 'json', ...params }).toString();
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(`${API}?${qs}`, { headers: { 'User-Agent': UA } });
      if (res.status === 429) { await sleep(12000); continue; }
      if (!res.ok) { console.warn(`  HTTP ${res.status}`); return null; }
      return await res.json();
    } catch (e) {
      console.warn(`  fetch error: ${e.message}`);
      await sleep(5000);
    }
  }
  return null;
}

async function searchFiles(query, limit = 6) {
  const data = await commons({
    action: 'query',
    list: 'search',
    srnamespace: '6',
    srlimit: String(limit),
    srsearch: query,
  });
  return data?.query?.search?.map((s) => s.title).filter((t) => /\.(jpe?g|png)$/i.test(t)) || [];
}

async function checkLicense(title) {
  const data = await commons({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: '1200',
  });
  const page = Object.values(data?.query?.pages || {})[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) return null;
  const licRaw = ii.extmetadata?.LicenseShortName?.value || '';
  const lic = licRaw.toLowerCase();
  const ok = ALLOWED_SIMPLE.some((a) => lic.startsWith(a)) || ALLOWED.test(licRaw);
  if (!ok) return null;
  if (!/^image\/(jpe?g|png)$/.test(ii.mime || '')) return null;
  return {
    title,
    url: ii.thumburl || ii.url,
    width: ii.thumbwidth || ii.width,
    height: ii.thumbheight || ii.height,
    license: licRaw,
    artist: (ii.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim(),
    pageUrl: ii.descriptionurl,
  };
}

async function main() {
  const locations = loadLocations();

  const results = {};
  let okCount = 0;
  let missCount = 0;

  for (const loc of locations) {
    const terms = loc.name_ja.replace(/^駅$/, '').trim();
    process.stdout.write(`${loc.id}: searching "${terms}" ... `);

    let candidates = await searchFiles(`${terms} ${loc.name_en.split(' ')[0]}`);
    if (!candidates.length) candidates = await searchFiles(terms);

    let chosen = null;
    for (const c of candidates.slice(0, 4)) {
      const lic = await checkLicense(c);
      if (lic) { chosen = lic; break; }
      await sleep(1500);
    }

    if (chosen) {
      results[loc.id] = { ...chosen, name_ja: loc.name_ja };
      okCount++;
      console.log(`OK: ${chosen.title} [${chosen.license}]`);
    } else {
      missCount++;
      console.log('MISS');
    }
    await sleep(1500);
  }

  writeFileSync(join(OUT_DIR, 'photos.json'), JSON.stringify(results, null, 2));
  console.log(`\n[done] ${okCount} photos found, ${missCount} missing -> site/src/data/photos.json`);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
