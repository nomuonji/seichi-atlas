// generate-og-images.mjs
// Builds per-page OGP images (1200x630 PNG) from an SVG template.
// Runs as part of the site build so every indexable page gets a
// share-ready image that works on X/Twitter, Facebook, LINE, etc.
//
// Usage: node scripts/generate-og-images.mjs
// Reads:  site/src/data/works.json, locations.json
// Writes: site/public/og/  (e.g. /og/anime-kimi-no-na-wa.png)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'site', 'public', 'og');
const require = createRequire(pathToFileURL(join(ROOT, 'site', 'package.json')));
const sharp = require('sharp');

const works = JSON.parse(readFileSync(join(ROOT, 'site', 'src', 'data', 'works.json'), 'utf8'));
const locations = JSON.parse(readFileSync(join(ROOT, 'site', 'src', 'data', 'locations.json'), 'utf8'));

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function svgCard({ title, sub, eyebrow }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#171a1f"/>
      <stop offset="1" stop-color="#242832"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g opacity="0.05" stroke="#ffffff">
    <path d="M0 105h1200M0 210h1200M0 315h1200M0 420h1200M0 525h1200M105 0v630M210 0v630M315 0v630M420 0v630M525 0v630M630 0v630M735 0v630M840 0v630M945 0v630M1050 0v630M1155 0v630" stroke-width="1"/>
  </g>
  <path d="M90 96c-34 0-62 27-62 60 0 44 62 104 62 104s62-60 62-104c0-33-28-60-62-60z" fill="#e8693f"/>
  <circle cx="90" cy="152" r="24" fill="#f6f3ec"/>
  <text x="180" y="130" font-family="Consolas, monospace" font-size="22" letter-spacing="4" fill="#e8693f">SEICHI ATLAS</text>
  <text x="90" y="420" font-family="Segoe UI, Arial, sans-serif" font-size="${title.length > 28 ? 42 : 54}" font-weight="600" fill="#ffffff">${esc(title)}</text>
  <text x="90" y="478" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#9a9da2">${esc(sub || '')}</text>
  <text x="90" y="550" font-family="Consolas, monospace" font-size="18" letter-spacing="3" fill="#6f7278">${esc(eyebrow || '')}</text>
</svg>`;
}

async function render(name, svg) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(join(OUT_DIR, `${name}.png`), png);
}

(async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const start = Date.now();
  let count = 0;

  // Home
  await render('home', svgCard({
    title: 'Every anime pilgrimage site, actually reachable.',
    sub: 'Coordinates · travel time · can you really visit?',
    eyebrow: `${works.length} SERIES · ${locations.length} LOCATIONS · VERIFIED`,
  }));
  count++;

  // Anime pages
  for (const w of works) {
    await render(`anime-${w.slug}`, svgCard({
      title: w.title_en,
      sub: w.title_ja,
      eyebrow: `${w.year} · ${w.type === 'film' ? 'FILM' : 'TV'} · ANIME PILGRIMAGE`,
    }));
    count++;
  }

  // Location pages
  for (const l of locations) {
    await render(`location-${l.slug}`, svgCard({
      title: l.name_en,
      sub: l.name_ja,
      eyebrow: `ANIME LOCATION · ${l.category.toUpperCase()} · COORDINATES ${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}`,
    }));
    count++;
  }

  console.log(`[og] generated ${count} images in ${Date.now() - start}ms`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
