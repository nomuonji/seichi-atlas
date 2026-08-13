// Core data types. Mirrors ../data/*.yaml schemas.

export type WorkType = 'tv' | 'film' | 'ova' | 'game';

export interface Work {
  id: string;
  title_en: string;
  title_ja: string;
  title_romaji: string;
  aliases: string[];
  type: WorkType;
  year: number;
  studio: string;
  mal_id?: number;
  anilist_id?: number;
  official_url?: string;
  // derived
  slug: string;
}

export type Category =
  | 'station'
  | 'shrine'
  | 'school'
  | 'shotengai'
  | 'shop'
  | 'bridge'
  | 'crossing'
  | 'park'
  | 'nature'
  | 'other';

export type Visitability = 'public' | 'limited' | 'private' | 'closed';

export interface StationRef {
  name_en: string;
  name_ja: string;
  lines: string[];
  walk_min: number;
}

export interface TravelFrom {
  minutes: number;
  transfers: number;
  fare_jpy: number;
}

export interface Location {
  id: string;
  name_en: string;
  name_ja: string;
  lat: number;
  lng: number;
  address_ja: string;
  address_en?: string;
  prefecture: string;
  municipality: string;
  category: Category;
  visitability: Visitability;
  visitability_note_en?: string;
  entry_fee?: 'free' | 'paid' | 'unknown';
  car_required: boolean;
  nearest_station?: StationRef;
  travel_from?: Partial<Record<'tokyo' | 'shinjuku' | 'osaka' | 'kyoto', TravelFrom>>;
  etiquette_en?: string[];
  former_names?: string[];
  photos?: PhotoRef[];
  last_verified: string; // ISO date
  // derived
  slug: string;
}

export interface PhotoRef {
  url: string;
  credit: string;
  license: string;
  license_url: string;
}

export type Confidence = 'confirmed' | 'likely' | 'disputed';

export interface SourceRef {
  url: string;
  type: 'official' | 'municipal' | 'news' | 'fanblog' | 'map';
  lang: string;
  retrieved_at: string;
}

export interface Appearance {
  work_id: string;
  location_id: string;
  scene_note_en: string;
  scene_ref?: string;
  confidence: Confidence;
  sources: SourceRef[];
}

export interface PrefectureMeta {
  id: string;
  name_en: string;
  name_ja: string;
  region: string;
}

export interface SourceMaster {
  domain: string;
  name: string;
  robots_ok: boolean;
  rate_sec: number;
  last_crawl?: string;
}

export interface DataBundle {
  works: Work[];
  locations: Location[];
  appearances: Appearance[];
  prefectures: PrefectureMeta[];
  sources: SourceMaster[];
}
