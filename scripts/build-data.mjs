// data/*.yaml → site/src/data/*.json
// Reads canonical YAML from ../data, normalizes slugs, and writes JSON bundles
// that the Astro site consumes. Idempotent; run before `astro build`.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(pathToFileURL(join(__dirname, '..', 'site', 'package.json')));
const yaml = require('js-yaml');
const DATA_DIR = join(__dirname, '..', 'data');
const OUT_DIR = join(__dirname, '..', 'site', 'src', 'data');

mkdirSync(OUT_DIR, { recursive: true });

function loadYaml(name) {
  const raw = readFileSync(join(DATA_DIR, name), 'utf8');
  return yaml.load(raw);
}

const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ---- Load canonical files ----
const works = loadYaml('works.yaml');
const locations = loadYaml('locations.yaml');
const appearances = loadYaml('appearances.yaml');
const prefectures = loadYaml('prefectures.yaml');
const sources = loadYaml('sources.yaml');

// ---- Validation ----
const workIds = new Set(works.map((w) => w.id));
const locIds = new Set(locations.map((l) => l.id));

for (const a of appearances) {
  if (!workIds.has(a.work_id)) throw new Error(`appearance references unknown work_id: ${a.work_id}`);
  if (!locIds.has(a.location_id)) throw new Error(`appearance references unknown location_id: ${a.location_id}`);
  if (a.confidence !== 'confirmed' && a.confidence !== 'likely' && a.confidence !== 'disputed') {
    throw new Error(`bad confidence ${a.confidence} on ${a.work_id}/${a.location_id}`);
  }
  if (a.confidence !== 'disputed' && (!a.sources || a.sources.length === 0)) {
    throw new Error(`non-disputed appearance needs >=1 source: ${a.work_id}/${a.location_id}`);
  }
}
for (const l of locations) {
  if (typeof l.lat !== 'number' || typeof l.lng !== 'number') {
    throw new Error(`location missing numeric coords: ${l.id}`);
  }
  if (!l.last_verified) throw new Error(`location missing last_verified: ${l.id}`);
}

// ---- Normalize ----
for (const w of works) w.slug = slugify(w.id);
for (const l of locations) l.slug = slugify(l.id);

// ---- Derived stats (per work) ----
const workStat = new Map();
for (const a of appearances) {
  const s = workStat.get(a.work_id) || { total: 0, confirmed: 0, daytrip: 0 };
  s.total += 1;
  if (a.confidence === 'confirmed') s.confirmed += 1;
  workStat.set(a.work_id, s);
}
const locByWork = new Map();
for (const a of appearances) {
  const arr = locByWork.get(a.work_id) || new Set();
  arr.add(a.location_id);
  locByWork.set(a.work_id, arr);
}
// day-trip: locations within tokyo travel_from <= 180 min
for (const [wid, locSet] of locByWork) {
  let daytrip = 0;
  for (const lid of locSet) {
    const loc = locations.find((l) => l.id === lid);
    const tf = loc?.travel_from?.tokyo;
    if (tf && tf.minutes <= 180) daytrip += 1;
  }
  const s = workStat.get(wid);
  s.daytrip = daytrip;
}

// ---- Derived stats (per location) ----
for (const l of locations) {
  l._works = appearances.filter((a) => a.location_id === l.id).map((a) => a.work_id);
}

// ---- Write bundles ----
const bundles = {
  works,
  locations,
  appearances,
  prefectures,
  sources,
  stats: {
    works: works.length,
    locations: locations.length,
    appearances: appearances.length,
    perWork: Object.fromEntries(workStat),
  },
};

for (const [name, data] of Object.entries(bundles)) {
  writeFileSync(join(OUT_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

console.log(`[build-data] wrote ${Object.keys(bundles).length} bundles`);
console.log(`[build-data] works=${works.length} locations=${locations.length} appearances=${appearances.length}`);
