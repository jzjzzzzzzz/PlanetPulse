// ============================================================
// NASA EONET v3 data layer
//
// Fetches environmental events from the NASA Earth Observatory
// Natural Event Tracker (EONET) v3 API and normalizes them into
// the application's internal EnvironmentalEvent shape.
//
// Supports both the JSON format (events array) and the GeoJSON
// format (features array) from the EONET v3 API.
// ============================================================

import { z } from "zod";
import type {
  EnvironmentalEvent,
  EventCategory,
  GeometryType,
  EventObservation,
  EventsResponseMetadata,
  DataFreshness,
} from "@/types/environment";
import { computeHotspotScore } from "@/lib/scoring/hotspot-score";
import { FALLBACK_EVENTS } from "@/lib/nasa/fallback";

// ============================================================
// Zod schemas — EONET v3 API response (JSON and GeoJSON)
// ============================================================

/** Single category from EONET */
const eonetCategorySchema = z.object({
  id: z.string(),
  title: z.string(),
});

/** Single geometry record */
const eonetGeometrySchema = z.object({
  date: z.string(),
  type: z.string(),
  coordinates: z.array(z.unknown()),
  magnitudeValue: z.number().nullable().optional(),
  magnitudeUnit: z.string().nullable().optional(),
});

/** Single source — v3 API uses `url`, not `title` */
const eonetSourceSchema = z.object({
  id: z.string(),
  url: z.string().optional(),
  // Some older source records may include a title
  title: z.string().optional(),
});

/** A single event from the v3 JSON endpoint */
const eonetEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  link: z.string(),
  closed: z.string().nullable().optional(),
  categories: z.array(eonetCategorySchema),
  geometry: z.array(eonetGeometrySchema),
  sources: z.array(eonetSourceSchema),
});

/** v3 JSON response: { title, description, link, events: [...] } */
const eonetJsonResponseSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  link: z.string().optional(),
  events: z.array(eonetEventSchema),
});

/** GeoJSON Feature — same shape, just wrapped differently */
const eonetGeoJsonFeatureSchema = eonetEventSchema;

/** GeoJSON FeatureCollection: { type, features: [...] } */
const eonetGeoJsonResponseSchema = z.object({
  type: z.string(),
  features: z.array(eonetGeoJsonFeatureSchema),
});

/** Union: try JSON first (current API), fall back to GeoJSON */
const eonetApiResponseSchema = z.union([
  eonetJsonResponseSchema,
  eonetGeoJsonResponseSchema,
]);

// ============================================================
// Return type
// ============================================================

/** The result of {@link fetchEonetEvents}, including provenance metadata. */
export type EonetEventsResult = {
  events: EnvironmentalEvent[];
  metadata: EventsResponseMetadata;
};

// ============================================================
// Constants
// ============================================================

const EONET_API_URL =
  "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=60&limit=500";

const EONET_CLOSED_URL =
  "https://eonet.gsfc.nasa.gov/api/v3/events?status=closed&days=7&limit=100";

const EONET_API_TIMEOUT_MS = 15_000;

const MAX_RETRY_ATTEMPTS = 2;

const MAX_OBSERVATIONS = 30;

/** Milliseconds: cache lifetime for live data before it becomes stale-cache */
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Mapping from EONET category titles to the application's internal
 * {@link EventCategory} values.
 */
const EONET_CATEGORY_MAP: Record<string, EventCategory> = {
  Wildfires: "wildfire",
  "Severe Storms": "severe-storm",
  Volcanoes: "volcano",
  Floods: "flood",
  Drought: "drought",
  "Dust and Haze": "dust-haze",
  Landslides: "landslide",
  "Sea and Lake Ice": "sea-lake-ice",
};

// ============================================================
// In-memory last-known-good cache
// ============================================================

type LiveCache = {
  events: EnvironmentalEvent[];
  fetchedAt: number; // Date.now() when cached
  upstreamUpdatedAt: string | null;
} | null;

let _liveCache: LiveCache = null;

function isCacheFresh(): boolean {
  if (!_liveCache) return false;
  return Date.now() - _liveCache.fetchedAt < CACHE_MAX_AGE_MS;
}

function getCachedEvents(): {
  events: EnvironmentalEvent[];
  fetchedAt: string;
  upstreamUpdatedAt: string | null;
} | null {
  if (!_liveCache) return null;
  return {
    events: _liveCache.events,
    fetchedAt: new Date(_liveCache.fetchedAt).toISOString(),
    upstreamUpdatedAt: _liveCache.upstreamUpdatedAt,
  };
}

function setLiveCache(events: EnvironmentalEvent[], upstreamUpdatedAt: string | null): void {
  _liveCache = {
    events,
    fetchedAt: Date.now(),
    upstreamUpdatedAt,
  };
}

// ============================================================
// Data freshness classification
// ============================================================

/**
 * Classify observation age into a deterministic freshness bucket.
 *
 * @param observedAt  ISO-8601 timestamp, or null if unknown.
 * @param now  The reference "now" moment (defaults to current time).
 */
export function classifyFreshness(
  observedAt: string | null,
  now: Date = new Date(),
): DataFreshness {
  if (!observedAt) return "unknown";

  const obs = new Date(observedAt);
  if (Number.isNaN(obs.getTime())) return "unknown";

  const ageMs = now.getTime() - obs.getTime();
  const ageMinutes = ageMs / (1000 * 60);

  if (ageMinutes < 30) return "live";
  if (ageMinutes < 360) return "recent";  // 6 hours
  if (ageMinutes < 1440) return "aging";   // 24 hours
  return "stale";
}

// ============================================================
// Helpers
// ============================================================

/**
 * Map an EONET category title (e.g. `"Wildfires"`) to the
 * application's internal {@link EventCategory}.
 */
function mapCategory(eonetTitle: string): EventCategory {
  const exact = EONET_CATEGORY_MAP[eonetTitle];
  if (exact) return exact;

  const lowered = eonetTitle.toLowerCase();
  for (const [key, value] of Object.entries(EONET_CATEGORY_MAP)) {
    if (key.toLowerCase() === lowered) return value;
  }

  if (lowered.includes("wildfire") || lowered.includes("fire")) return "wildfire";
  if (lowered.includes("storm") || lowered.includes("cyclone") || lowered.includes("hurricane"))
    return "severe-storm";
  if (lowered.includes("volcano")) return "volcano";
  if (lowered.includes("flood")) return "flood";
  if (lowered.includes("drought")) return "drought";
  if (lowered.includes("dust") || lowered.includes("haze")) return "dust-haze";
  if (lowered.includes("landslide") || lowered.includes("mudslide")) return "landslide";
  if (lowered.includes("sea") || lowered.includes("lake") || lowered.includes("ice")) return "sea-lake-ice";

  return "other";
}

function isValidLat(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

function isValidLng(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

/** Compute the centroid of a polygon outer ring. */
function polygonCentroid(
  outerRing: unknown,
): { latitude: number; longitude: number } | null {
  if (!Array.isArray(outerRing) || outerRing.length < 3) return null;

  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  for (const point of outerRing) {
    if (!Array.isArray(point) || point.length < 2) continue;

    const lng = Number(point[0]);
    const lat = Number(point[1]);

    if (isValidLat(lat) && isValidLng(lng)) {
      sumLat += lat;
      sumLng += lng;
      count++;
    }
  }

  if (count === 0) return null;

  return {
    latitude: sumLat / count,
    longitude: sumLng / count,
  };
}

/**
 * Extract a valid lat/lng pair and geometry type from the EONET geometry
 * array. Iterates newest-first, returns the first valid record.
 */
function extractCoordinates(
  geometryRecords: z.infer<typeof eonetGeometrySchema>[],
): { latitude: number; longitude: number; geometryType: GeometryType } | null {
  if (!Array.isArray(geometryRecords) || geometryRecords.length === 0) return null;

  const sorted = [...geometryRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  for (const record of sorted) {
    const geoType = record.type;
    const coords = record.coordinates;

    if (geoType === "Point") {
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (isValidLat(lat) && isValidLng(lng)) {
        return { latitude: lat, longitude: lng, geometryType: "Point" };
      }
    } else if (geoType === "Polygon") {
      if (!Array.isArray(coords) || coords.length === 0) continue;
      const centroid = polygonCentroid(coords[0]);
      if (centroid) {
        return {
          latitude: centroid.latitude,
          longitude: centroid.longitude,
          geometryType: "Polygon",
        };
      }
    }
    // Other GeoJSON types are skipped
  }

  return null;
}

function parseDateSafe(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ============================================================
// Observation extraction
// ============================================================

/**
 * Extract observations from the EONET geometry history.
 *
 * Sorts chronologically, deduplicates identical entries, rejects
 * invalid coordinates, and retains at most {@link MAX_OBSERVATIONS}.
 */
function extractObservations(
  geometryRecords: z.infer<typeof eonetGeometrySchema>[],
): EventObservation[] {
  if (!Array.isArray(geometryRecords) || geometryRecords.length === 0) return [];

  // Parse each geometry record into an observation
  const raw: EventObservation[] = [];

  for (const record of geometryRecords) {
    const geoType = record.type;
    const coords = record.coordinates;
    let lat: number;
    let lng: number;

    if (geoType === "Point") {
      if (!Array.isArray(coords) || coords.length < 2) continue;
      lng = Number(coords[0]);
      lat = Number(coords[1]);
    } else if (geoType === "Polygon") {
      if (!Array.isArray(coords) || coords.length === 0) continue;
      const centroid = polygonCentroid(coords[0]);
      if (!centroid) continue;
      lat = centroid.latitude;
      lng = centroid.longitude;
    } else {
      continue; // skip unsupported geometry types
    }

    if (!isValidLat(lat) || !isValidLng(lng)) continue;

    const observedAt = parseDateSafe(record.date);
    const magnitudeValue =
      record.magnitudeValue != null && typeof record.magnitudeValue === "number"
        ? record.magnitudeValue
        : null;
    const magnitudeUnit =
      record.magnitudeUnit != null && typeof record.magnitudeUnit === "string"
        ? record.magnitudeUnit
        : null;

    raw.push({
      observedAt: observedAt ? observedAt.toISOString() : null,
      latitude: lat,
      longitude: lng,
      magnitudeValue,
      magnitudeUnit,
    });
  }

  if (raw.length === 0) return [];

  // Sort chronologically (oldest first)
  raw.sort((a, b) => {
    const aTime = a.observedAt ? new Date(a.observedAt).getTime() : 0;
    const bTime = b.observedAt ? new Date(b.observedAt).getTime() : 0;
    return aTime - bTime;
  });

  // Deduplicate: drop consecutive identical observations
  const deduped: EventObservation[] = [];
  for (const obs of raw) {
    const last = deduped[deduped.length - 1];
    if (
      last &&
      last.observedAt === obs.observedAt &&
      last.latitude === obs.latitude &&
      last.longitude === obs.longitude &&
      last.magnitudeValue === obs.magnitudeValue &&
      last.magnitudeUnit === obs.magnitudeUnit
    ) {
      continue; // duplicate
    }
    deduped.push(obs);
  }

  // Truncate to max observations
  if (deduped.length > MAX_OBSERVATIONS) {
    return deduped.slice(deduped.length - MAX_OBSERVATIONS);
  }

  return deduped;
}

// ============================================================
// Normalize a single EONET event
// ============================================================

type EonetRawEvent = z.infer<typeof eonetEventSchema>;

function normalizeEvent(feature: EonetRawEvent): EnvironmentalEvent | null {
  const coords = extractCoordinates(feature.geometry);
  if (!coords) return null;

  const primaryCategory =
    feature.categories.length > 0
      ? mapCategory(feature.categories[0].title)
      : "other";

  const observations = extractObservations(feature.geometry);

  // Use latest observation for primary coordinates and magnitude
  const latestObs = observations[observations.length - 1] ?? null;
  const magnitudeValue = latestObs?.magnitudeValue ?? null;
  const magnitudeUnit = latestObs?.magnitudeUnit ?? null;

  // Derive temporal range from observation dates
  const obsDates = observations
    .filter((o) => o.observedAt !== null)
    .map((o) => new Date(o.observedAt!).getTime());

  let startedAt: string | null = null;
  let updatedAt: string | null = null;

  if (obsDates.length > 0) {
    startedAt = new Date(Math.min(...obsDates)).toISOString();
    updatedAt = new Date(Math.max(...obsDates)).toISOString();
  }

  // Source label — prefer id + url format from v3
  const primarySource = feature.sources[0];
  const sourceName =
    primarySource?.title ??
    primarySource?.id ??
    "NASA EONET";

  const sourceUrl: string | null = feature.link ?? null;

  const observationCount = observations.length;

  const hotspotResult = computeHotspotScore({
    category: primaryCategory,
    updatedAt,
    startedAt,
    magnitudeValue,
    magnitudeUnit,
    isOpen: true,
    observationCount,
  });

  return {
    id: feature.id,
    title: feature.title,
    category: primaryCategory,
    latitude: coords.latitude,
    longitude: coords.longitude,
    startedAt,
    updatedAt,
    sourceName,
    sourceUrl,
    geometryType: coords.geometryType,
    magnitudeValue,
    magnitudeUnit,
    hotspotScore: hotspotResult.score,
    scoreExplanation: hotspotResult.explanation,
    observations,
  };
}

// ============================================================
// Retry helper
// ============================================================

async function fetchWithRetry(
  url: string,
  attempts: number,
): Promise<{ response: Response; attemptCount: number }> {
  let lastError: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(EONET_API_TIMEOUT_MS),
      });

      if (response.ok) {
        return { response, attemptCount: i + 1 };
      }

      // Non-2xx: don't retry on 4xx client errors
      if (response.status >= 400 && response.status < 500) {
        throw new Error(
          `EONET API returned HTTP ${response.status} ${response.statusText}`.trim(),
        );
      }

      lastError = new Error(
        `EONET API returned HTTP ${response.status} ${response.statusText}`.trim(),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new Error("EONET API request timed out");
      } else if (error instanceof TypeError) {
        lastError = new Error(`EONET API network error: ${error.message}`);
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    // Last attempt — don't wait
    if (i < attempts - 1) {
      // Exponential backoff: 500ms, 1500ms
      await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, i)));
    }
  }

  throw lastError ?? new Error("EONET API request failed after all retries");
}

// ============================================================
// Public API
// ============================================================

/**
 * Fetch open environmental events from the NASA EONET v3 API and
 * normalise them into {@link EnvironmentalEvent} objects.
 *
 * On success, the returned metadata `source` is `"live"` and the
 * response is cached as last-known-good for future fallback.
 *
 * When the live fetch fails:
 * 1. If a fresh cache exists (< 30 min old), returns `"stale-cache"`.
 * 2. If the cache is stale or absent, falls back to bundled sample data.
 *
 * @returns An object containing the normalised events and full
 *          provenance metadata.
 */
export async function fetchEonetEvents(): Promise<EonetEventsResult> {
  const fetchedAt = new Date().toISOString();

  // If we have a fresh cache, return it immediately as "live"
  if (isCacheFresh() && _liveCache) {
    return {
      events: _liveCache.events,
      metadata: {
        source: "live",
        provider: "NASA EONET",
        format: "json",
        fetchedAt,
        upstreamUpdatedAt: _liveCache.upstreamUpdatedAt,
        eventCount: _liveCache.events.length,
        attemptCount: 0,
        degradedReason: null,
      },
    };
  }

  try {
    const { response, attemptCount } = await fetchWithRetry(EONET_API_URL, MAX_RETRY_ATTEMPTS);

    const raw: unknown = await response.json();

    // Parse — union schema tries JSON format first, then GeoJSON
    const parsed = eonetApiResponseSchema.parse(raw);

    // Extract the events array regardless of format
    const features: z.infer<typeof eonetEventSchema>[] =
      "events" in parsed ? parsed.events : parsed.features;

    const format: "json" | "geojson" = "events" in parsed ? "json" : "geojson";

    const events: EnvironmentalEvent[] = [];
    for (const feature of features) {
      const normalized = normalizeEvent(feature);
      if (normalized) events.push(normalized);
    }

    // Determine upstream timestamp — use the newest geometry date across all events
    let upstreamUpdatedAt: string | null = null;
    let maxObsTime = 0;

    for (const evt of events) {
      if (evt.observations.length > 0) {
        const lastObs = evt.observations[evt.observations.length - 1];
        if (lastObs.observedAt) {
          const t = new Date(lastObs.observedAt).getTime();
          if (t > maxObsTime) {
            maxObsTime = t;
            upstreamUpdatedAt = lastObs.observedAt;
          }
        }
      }
    }

    // Update the last-known-good cache
    setLiveCache(events, upstreamUpdatedAt);

    return {
      events,
      metadata: {
        source: "live",
        provider: "NASA EONET",
        format,
        fetchedAt,
        upstreamUpdatedAt,
        eventCount: events.length,
        attemptCount,
        degradedReason: null,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error("[eonet] Live fetch failed:", errorMessage);

    // Try stale cache first
    const cached = getCachedEvents();
    if (cached) {
      console.error("[eonet] Returning stale cache from", cached.fetchedAt);
      return {
        events: cached.events,
        metadata: {
          source: "stale-cache",
          provider: "NASA EONET",
          format: "json",
          fetchedAt,
          upstreamUpdatedAt: cached.upstreamUpdatedAt,
          eventCount: cached.events.length,
          attemptCount: MAX_RETRY_ATTEMPTS,
          degradedReason: `Live fetch failed: ${errorMessage}. Using cached data from ${cached.fetchedAt}.`,
        },
      };
    }

    // Fallback to bundled sample data
    console.error("[eonet] No cache available — using fallback sample data.");
    return {
      events: FALLBACK_EVENTS,
      metadata: {
        source: "fallback",
        provider: "NASA EONET",
        format: "fallback",
        fetchedAt,
        upstreamUpdatedAt: null,
        eventCount: FALLBACK_EVENTS.length,
        attemptCount: MAX_RETRY_ATTEMPTS,
        degradedReason: `Live fetch failed: ${errorMessage}. Using local sample data.`,
      },
    };
  }
}
