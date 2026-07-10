// ============================================================
// NASA EONET v3 data layer
//
// Fetches environmental events from the NASA Earth Observatory
// Natural Event Tracker (EONET) v3 API and normalizes them into
// the application's internal EnvironmentalEvent shape.
// ============================================================

import { z } from "zod";
import type { EnvironmentalEvent, EventCategory, GeometryType } from "@/types/environment";
import { computeHotspotScore } from "@/lib/scoring/hotspot-score";
import { FALLBACK_EVENTS } from "@/lib/nasa/fallback";

// ============================================================
// Zod schemas — EONET v3 GeoJSON FeatureCollection
// ============================================================

const eonetCategorySchema = z.object({
  id: z.string(),
  title: z.string(),
});

const eonetGeometrySchema = z.object({
  date: z.string(),
  type: z.string(),
  coordinates: z.array(z.unknown()),
  magnitudeValue: z.number().nullable().optional(),
  magnitudeUnit: z.string().nullable().optional(),
});

const eonetSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string().optional(),
});

const eonetFeatureSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  link: z.string(),
  categories: z.array(eonetCategorySchema),
  geometry: z.array(eonetGeometrySchema),
  sources: z.array(eonetSourceSchema),
});

const eonetResponseSchema = z.object({
  type: z.string(),
  features: z.array(eonetFeatureSchema),
});

/** A single feature from the EONET v3 GeoJSON response. */
type EonetFeature = z.infer<typeof eonetFeatureSchema>;

// ============================================================
// Return type
// ============================================================

/** The result of {@link fetchEonetEvents}, including provenance. */
export type EonetEventsResult = {
  events: EnvironmentalEvent[];
  source: "live" | "fallback";
};

// ============================================================
// Constants
// ============================================================

const EONET_API_URL =
  "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=200";

/**
 * Mapping from EONET category titles to the application's internal
 * {@link EventCategory} values.  Titles not in this map are normalised
 * with a best-effort substring matcher; everything else becomes `"other"`.
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
// Helpers
// ============================================================

/**
 * Map an EONET category title (e.g. `"Wildfires"`) to the
 * application's internal {@link EventCategory}.  Falls back to
 * `"other"` when the title cannot be matched.
 */
function mapCategory(eonetTitle: string): EventCategory {
  // Exact match first
  const exact = EONET_CATEGORY_MAP[eonetTitle];
  if (exact) return exact;

  // Case-insensitive lookup
  const lowered = eonetTitle.toLowerCase();
  for (const [key, value] of Object.entries(EONET_CATEGORY_MAP)) {
    if (key.toLowerCase() === lowered) return value;
  }

  // Substring fallback for minor label variations
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

/** Returns `true` when `lat` is a valid geographic latitude. */
function isValidLat(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

/** Returns `true` when `lng` is a valid geographic longitude. */
function isValidLng(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

/**
 * Compute the centroid of a polygon outer ring.
 *
 * GeoJSON polygon coordinates are structured as:
 * `[[[lng, lat], [lng, lat], ...]]` where the first element
 * is the outer ring.
 */
function polygonCentroid(
  outerRing: unknown
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
 * array.  Iterates through geometries sorted newest-first and returns
 * the first one that yields valid coordinates.  Returns `null` if no
 * geometry record can be resolved.
 */
function extractCoordinates(
  geometryRecords: EonetFeature["geometry"]
): { latitude: number; longitude: number; geometryType: GeometryType } | null {
  if (!Array.isArray(geometryRecords) || geometryRecords.length === 0) return null;

  // Process most-recent first
  const sorted = [...geometryRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
    // Other GeoJSON types (MultiPoint, LineString, etc.) are skipped
  }

  return null;
}

/**
 * Safely parse a date string.  Returns `null` for any input that
 * produces an invalid `Date`.
 */
function parseDateSafe(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ============================================================
// Public API
// ============================================================

/**
 * Fetch open environmental events from the NASA EONET v3 API and
 * normalise them into {@link EnvironmentalEvent} objects.
 *
 * On success the returned `source` is `"live"`.  When the network
 * request fails (non-2xx, timeout, DNS error, …) the function falls
 * back to reading `data/fallback-events.json` from the project root
 * and sets `source` to `"fallback"`.  If the fallback file is also
 * unavailable an empty events array is returned (still with
 * `source: "fallback"`).
 *
 * @returns An object containing the normalised events and a
 *          `source` discriminator indicating whether the data came
 *          from the live API or the local fallback file.
 */
export async function fetchEonetEvents(): Promise<EonetEventsResult> {
  try {
    const response = await fetch(EONET_API_URL, {
      headers: { Accept: "application/json" },
      // Use a reasonable timeout via AbortController so we don't hang
      // indefinitely.  Next.js fetch is extended with a `signal`-aware
      // timeout, but we set one explicitly for safety in edge runtimes.
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(
        `EONET API returned HTTP ${response.status} ${response.statusText}`.trim()
      );
    }

    const raw: unknown = await response.json();

    // Validate the response shape before we touch it
    const parsed = eonetResponseSchema.parse(raw);

    // Normalise every feature into an EnvironmentalEvent, dropping
    // features that lack usable coordinates.
    const events: EnvironmentalEvent[] = [];

    for (const feature of parsed.features) {
      const coords = extractCoordinates(feature.geometry);
      if (!coords) continue; // no valid geometry → skip

      // Pick the primary category (first in the array)
      const primaryCategory =
        feature.categories.length > 0
          ? mapCategory(feature.categories[0].title)
          : "other";

      // Magnitude comes from the most-recent geometry record
      const sortedGeom = [...feature.geometry].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latestGeom = sortedGeom[0];
      const magnitudeValue = latestGeom?.magnitudeValue ?? null;
      const magnitudeUnit = latestGeom?.magnitudeUnit ?? null;

      // Derive temporal range from the geometry date span
      let startedAt: string | null = null;
      let updatedAt: string | null = null;

      const parsedDates = feature.geometry
        .map((g) => parseDateSafe(g.date))
        .filter((d): d is Date => d !== null)
        .map((d) => d.getTime());

      if (parsedDates.length > 0) {
        startedAt = new Date(Math.min(...parsedDates)).toISOString();
        updatedAt = new Date(Math.max(...parsedDates)).toISOString();
      }

      // Primary source label
      const sourceName =
        feature.sources.length > 0
          ? feature.sources[0].title
          : "NASA EONET";

      const sourceUrl: string | null = feature.link ?? null;

      // Compute the hotspot score via the shared scoring utility.
      // We pass `isOpen: true` because the API query filters to
      // `status=open`.  observationCount and nearbyFireCount are
      // left undefined — the scorer handles the defaults.
      const hotspotResult = computeHotspotScore({
        category: primaryCategory,
        updatedAt,
        startedAt,
        magnitudeValue,
        magnitudeUnit,
        isOpen: true,
      });

      events.push({
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
      });
    }

    return { events, source: "live" };
  } catch (error) {
    // Log the root cause server-side (no secrets in these messages)
    console.error(
      "[eonet] Live fetch failed:",
      error instanceof Error ? error.message : String(error)
    );
    console.error("[eonet] Falling back to local data file.");

    return loadFallback();
  }
}

// ============================================================
// Fallback
// ============================================================

/**
 * Attempt to read and parse the local fallback dataset.
 * Returns an empty array when the file is missing or unparseable.
 */
async function loadFallback(): Promise<EonetEventsResult> {
  // Use inline TypeScript constants — no file-system access or JSON parsing.
  // Reliably available at runtime regardless of serverless environment.
  console.error(`[eonet] Using ${FALLBACK_EVENTS.length} bundled fallback events.`);
  return { events: FALLBACK_EVENTS, source: "fallback" };
}
