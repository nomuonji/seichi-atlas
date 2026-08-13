import type {
  DataBundle,
  Work,
  Location,
  Appearance,
} from './types';
import worksRaw from '../data/works.json';
import locationsRaw from '../data/locations.json';
import appearancesRaw from '../data/appearances.json';
import prefecturesRaw from '../data/prefectures.json';
import statsRaw from '../data/stats.json';

export const works = worksRaw as Work[];
export const locations = locationsRaw as Location[];
export const appearances = appearancesRaw as Appearance[];
export const prefectures = prefecturesRaw as { id: string; name_en: string; name_ja: string; region: string }[];
export const stats = statsRaw as DataBundle['stats'];

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Pre-compute slug maps
export const workBySlug = new Map<string, Work>();
for (const w of works) workBySlug.set(slugify(w.id), w);

export const locationBySlug = new Map<string, Location>();
for (const l of locations) locationBySlug.set(slugify(l.id), l);

export const prefectureByName = new Map<string, { id: string; name_en: string; name_ja: string }>();
for (const p of prefectures) prefectureByName.set(p.id, p);

export const prefectureById = prefectureByName;

export function appearancesForWork(workId: string): Appearance[] {
  return appearances.filter((a) => a.work_id === workId);
}
export function appearancesForLocation(locationId: string): Appearance[] {
  return appearances.filter((a) => a.location_id === locationId);
}
export function worksForLocation(locationId: string): Work[] {
  const ids = new Set(appearancesForLocation(locationId).map((a) => a.work_id));
  return works.filter((w) => ids.has(w.id));
}
export function locationsForWork(workId: string): Location[] {
  const ids = new Set(appearancesForWork(workId).map((a) => a.location_id));
  return locations.filter((l) => ids.has(l.id));
}
export function dayTripLocationsForWork(workId: string): Location[] {
  return locationsForWork(workId).filter((l) => {
    const tf = l.travel_from?.tokyo;
    return tf && tf.minutes <= 180;
  });
}
