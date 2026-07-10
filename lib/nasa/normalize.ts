// ============================================================
// Planet Pulse — NASA EONET data normalization helpers
// ============================================================

import type { EventCategory } from "@/types/environment";

// ---------------------------------------------------------------------------
// Category mapping (EONET raw strings → EventCategory)
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, EventCategory> = {
  wildfires: "wildfire",
  wildfire: "wildfire",
  "severe storms": "severe-storm",
  "severe storm": "severe-storm",
  storms: "severe-storm",
  storm: "severe-storm",
  volcanoes: "volcano",
  volcano: "volcano",
  floods: "flood",
  flood: "flood",
  drought: "drought",
  droughts: "drought",
  "dust and haze": "dust-haze",
  "dust & haze": "dust-haze",
  dust: "dust-haze",
  haze: "dust-haze",
  landslides: "landslide",
  landslide: "landslide",
  "sea and lake ice": "sea-lake-ice",
  "sea & lake ice": "sea-lake-ice",
  "sea ice": "sea-lake-ice",
  "lake ice": "sea-lake-ice",
  "iceberg": "sea-lake-ice",
  icebergs: "sea-lake-ice",
  "ice": "sea-lake-ice",
};

/**
 * Maps a raw EONET category string (or any similar source string) to our
 * canonical EventCategory. Falls back to "other" for unrecognized input.
 */
export function normalizeCategory(raw: string): EventCategory {
  if (!raw) {
    return "other";
  }

  const key = raw.trim().toLowerCase();
  return CATEGORY_MAP[key] ?? "other";
}

// ---------------------------------------------------------------------------
// Title-based category fallback
// ---------------------------------------------------------------------------

const TITLE_KEYWORDS: [EventCategory, RegExp][] = [
  ["wildfire", /\bwildfire|wild fire|forest fire|bushfire|bush fire\b/i],
  ["severe-storm", /\bsevere storm|cyclone|hurricane|typhoon|tornado|tropical storm|supercell|thunderstorm\b/i],
  ["volcano", /\bvolcano|volcanic|eruption|magma|lava\b/i],
  ["flood", /\bflood|flooding|flash flood|inundation\b/i],
  ["drought", /\bdrought|dry spell|water scarcity\b/i],
  ["dust-haze", /\bdust|haze|sandstorm|dust storm|smog|smoke\b/i],
  ["landslide", /\blandslide|mudslide|rockfall|debris flow|avalanche\b/i],
  ["sea-lake-ice", /\bsea ice|lake ice|iceberg|ice shelf|ice sheet|sea and lake ice\b/i],
];

/**
 * Attempts to infer an EventCategory from an event title by matching against
 * known keyword patterns. Returns null when no confident match is found.
 */
export function categoryFromTitle(title: string): EventCategory | null {
  if (!title) {
    return null;
  }

  for (const [category, pattern] of TITLE_KEYWORDS) {
    if (pattern.test(title)) {
      return category;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

interface RawGeometry {
  date?: unknown;
  type?: unknown;
  coordinates?: unknown;
  magnitudeValue?: unknown;
  magnitudeUnit?: unknown;
}

interface NormalizedGeometry {
  type: string;
  coordinates: unknown;
  date: string;
  magnitudeValue?: number | null;
  magnitudeUnit?: string | null;
}

/**
 * Returns the most-recent geometry entry from an array of raw EONET geometry
 * objects, sorted by the `date` field descending. Returns null when the array
 * is empty, null, or contains no entries with a valid date.
 */
export function getMostRecentGeometry(
  geometries: unknown[]
): NormalizedGeometry | null {
  if (!geometries || !Array.isArray(geometries) || geometries.length === 0) {
    return null;
  }

  const parsed: NormalizedGeometry[] = [];

  for (const g of geometries) {
    if (g == null || typeof g !== "object") {
      continue;
    }

    const raw = g as RawGeometry;

    const date =
      typeof raw.date === "string" ? raw.date : null;
    if (date === null) {
      continue;
    }

    const type =
      typeof raw.type === "string" ? raw.type : "Unknown";

    const magnitudeValue =
      raw.magnitudeValue != null && typeof raw.magnitudeValue === "number"
        ? raw.magnitudeValue
        : null;

    const magnitudeUnit =
      raw.magnitudeUnit != null && typeof raw.magnitudeUnit === "string"
        ? raw.magnitudeUnit
        : null;

    parsed.push({
      type,
      coordinates: raw.coordinates ?? null,
      date,
      magnitudeValue,
      magnitudeUnit,
    });
  }

  if (parsed.length === 0) {
    return null;
  }

  // Sort by date descending — most recent first.
  parsed.sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return bTime - aTime;
  });

  return parsed[0];
}

// ---------------------------------------------------------------------------
// Polygon centroid
// ---------------------------------------------------------------------------

/**
 * Calculates the centroid of a polygon's outer ring using the shoelace formula.
 *
 * Accepts a GeoJSON-style Polygon coordinate array: the first element is the
 * outer ring, an array of [longitude, latitude] pairs.
 *
 * Returns { lat, lng } for the approximate center of the polygon.
 */
export function polygonCenter(coordinates: number[][][]): {
  lat: number;
  lng: number;
} {
  // Default to origin if input is unusable.
  const ring = coordinates?.[0];

  if (!ring || !Array.isArray(ring) || ring.length < 3) {
    return { lat: 0, lng: 0 };
  }

  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = ring.length;

  for (let i = 0; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % n];

    if (
      x0 == null ||
      y0 == null ||
      x1 == null ||
      y1 == null ||
      typeof x0 !== "number" ||
      typeof y0 !== "number" ||
      typeof x1 !== "number" ||
      typeof y1 !== "number"
    ) {
      continue;
    }

    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  area /= 2;

  if (area === 0) {
    // Degenerate polygon — fall back to arithmetic mean.
    let sumLng = 0;
    let sumLat = 0;
    let count = 0;
    for (const point of ring) {
      if (
        point?.[0] != null &&
        point?.[1] != null &&
        typeof point[0] === "number" &&
        typeof point[1] === "number"
      ) {
        sumLng += point[0];
        sumLat += point[1];
        count++;
      }
    }
    return count > 0 ? { lat: sumLat / count, lng: sumLng / count } : { lat: 0, lng: 0 };
  }

  const factor = 1 / (6 * area);
  return {
    lat: cy * factor,
    lng: cx * factor,
  };
}

// ---------------------------------------------------------------------------
// Coordinate validation
// ---------------------------------------------------------------------------

/**
 * Validates that latitude and longitude are within Earth's valid ranges.
 * Latitude: -90 to 90, Longitude: -180 to 180.
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return false;
  }

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return false;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// ---------------------------------------------------------------------------
// URL sanitization
// ---------------------------------------------------------------------------

/**
 * Returns the url if it is an http: or https: URL, otherwise null.
 * Accepts null / undefined gracefully (returns null).
 */
export function sanitizeUrl(
  url: string | null | undefined
): string | null {
  if (url == null || typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}
