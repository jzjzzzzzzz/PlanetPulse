// ============================================================
// Planet Pulse — NASA FIRMS (Fire Information for Resource
// Management System) data layer.
// ============================================================

import { FireDetection } from "@/types/environment";

// ── Types ────────────────────────────────────────────────────────────────

/** Successful FIRMS response with detections */
export type FirmsSuccess = {
  detections: FireDetection[];
  source: string;
};

/** Returned when the FIRMS API key is not configured */
export type FirmsUnavailable = {
  detections: [];
  source: "unavailable";
  message: string;
};

/** Returned on validation, network, or parse errors */
export type FirmsError = {
  detections: [];
  source: string;
  error: string;
  message: string;
};

/** Discriminated union of all possible FIRMS fetch outcomes */
export type FirmsResult = FirmsSuccess | FirmsUnavailable | FirmsError;

// ── Constants ─────────────────────────────────────────────────────────────

const FIRMS_API_BASE =
  "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const DEFAULT_SOURCE = "VIIRS_SNPP_NRT";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MIN_DAYS = 1;
const MAX_DAYS = 7;
const MAX_LON_SPAN = 60; // degrees — reject requests covering more than this
const MAX_LAT_SPAN = 30; // degrees

/** Expected column order from the FIRMS Area CSV endpoint */
const CSV_HEADERS = [
  "latitude",
  "longitude",
  "bright_ti4",
  "scan",
  "track",
  "acq_date",
  "acq_time",
  "satellite",
  "instrument",
  "confidence",
  "version",
  "bright_ti5",
  "frp",
  "daynight",
];

// ── Simple in-memory cache ────────────────────────────────────────────────

type CacheEntry = {
  detections: FireDetection[];
  source: string;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();

function makeCacheKey(
  bbox: { west: number; south: number; east: number; north: number },
  days: number,
  source: string,
): string {
  const { west, south, east, north } = bbox;
  return `${source}:${west},${south},${east},${north}:${days}`;
}

function cacheGet(key: string): FirmsSuccess | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return { detections: entry.detections, source: entry.source };
}

function cacheSet(
  key: string,
  detections: FireDetection[],
  source: string,
): void {
  cache.set(key, { detections, source, timestamp: Date.now() });
}

// ── Validation helpers ────────────────────────────────────────────────────

function validateBbox(bbox: {
  west: number;
  south: number;
  east: number;
  north: number;
}): string | null {
  const { west, south, east, north } = bbox;

  if (
    typeof west !== "number" ||
    typeof south !== "number" ||
    typeof east !== "number" ||
    typeof north !== "number"
  ) {
    return "Bounding box coordinates must be numbers.";
  }

  if (
    Number.isNaN(west) ||
    Number.isNaN(south) ||
    Number.isNaN(east) ||
    Number.isNaN(north)
  ) {
    return "Bounding box coordinates must not be NaN.";
  }

  if (!Number.isFinite(west) || !Number.isFinite(south) || !Number.isFinite(east) || !Number.isFinite(north)) {
    return "Bounding box coordinates must be finite numbers.";
  }

  if (west < -180 || west > 180 || east < -180 || east > 180) {
    return "Longitude must be between -180 and 180.";
  }

  if (south < -90 || south > 90 || north < -90 || north > 90) {
    return "Latitude must be between -90 and 90.";
  }

  if (west >= east) {
    return "West longitude must be less than east longitude.";
  }

  if (south >= north) {
    return "South latitude must be less than north latitude.";
  }

  const lonSpan = east - west;
  const latSpan = north - south;

  if (lonSpan > MAX_LON_SPAN) {
    return `Longitude span (${lonSpan.toFixed(2)}°) exceeds maximum allowed (${MAX_LON_SPAN}°).`;
  }

  if (latSpan > MAX_LAT_SPAN) {
    return `Latitude span (${latSpan.toFixed(2)}°) exceeds maximum allowed (${MAX_LAT_SPAN}°).`;
  }

  return null;
}

function validateDays(days: number): string | null {
  if (typeof days !== "number" || Number.isNaN(days)) {
    return "Days must be a number.";
  }
  if (!Number.isFinite(days)) {
    return "Days must be a finite number.";
  }
  if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) {
    return `Days must be an integer between ${MIN_DAYS} and ${MAX_DAYS}.`;
  }
  return null;
}

// ── CSV parsing ───────────────────────────────────────────────────────────

/**
 * Convert a raw confidence value to a numeric score.
 *
 * VIIRS SNPP  uses categorical labels: "h" (high), "n" (nominal), "l" (low).
 * MODIS / VIIRS NOAA-20 use numeric  0-100.
 */
function parseConfidence(raw: string): number {
  const lower = raw.trim().toLowerCase();
  if (lower === "h") return 80;
  if (lower === "n") return 50;
  if (lower === "l") return 20;
  const num = Number(raw);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * A detection is "confirmed" when numeric confidence >= 70 (MODIS) or the
 * VIIRS categorical label is "h" (high).
 */
function isDetectionConfirmed(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  if (lower === "h") return true;
  const num = Number(raw);
  if (!Number.isNaN(num) && num >= 70) return true;
  return false;
}

/**
 * Parse the FIRMS Area CSV response into an array of FireDetection objects.
 *
 * Expected header row (14 columns):
 *   latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,
 *   satellite,instrument,confidence,version,bright_ti5,frp,daynight
 */
function parseFirmsCsv(csvText: string): FireDetection[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return []; // header-only, no detections

  // Parse header line to build a column index map (handles reordered columns).
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const colIndex: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    colIndex[headers[i]] = i;
  }

  // Verify all expected columns are present.
  const missingColumns = CSV_HEADERS.filter((h) => !(h in colIndex));
  if (missingColumns.length > 0) {
    throw new Error(
      `CSV is missing expected column(s): ${missingColumns.join(", ")}`,
    );
  }

  const detections: FireDetection[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(",");
    if (cols.length < CSV_HEADERS.length) continue; // skip malformed rows

    // Extract fields by column index so we're robust to reordering.
    const get = (header: string): string =>
      cols[colIndex[header]]?.trim() ?? "";

    const lat = parseFloat(get("latitude"));
    const lng = parseFloat(get("longitude"));
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue; // skip rows with bad coordinates

    const bright = parseFloat(get("bright_ti4"));
    const scanPixels = parseFloat(get("scan"));
    const confidenceRaw = get("confidence");
    const acqDate = get("acq_date");
    const acqTime = get("acq_time");
    const satellite = get("satellite");

    const id = `firms-${lat}-${lng}-${acqDate}-${acqTime}`;

    detections.push({
      id,
      latitude: lat,
      longitude: lng,
      brightness: Number.isNaN(bright) ? 0 : bright,
      confidence: parseConfidence(confidenceRaw),
      acqDate,
      acqTime,
      satellite,
      scanPixels: Number.isNaN(scanPixels) ? 0 : scanPixels,
      isConfirmed: isDetectionConfirmed(confidenceRaw),
    });
  }

  return detections;
}

// ── Main API function ─────────────────────────────────────────────────────

/**
 * Fetch fire detections from the NASA FIRMS Area API for a bounding box.
 *
 * @param bbox  - Geographic bounding box { west, south, east, north }.
 * @param days  - Lookback window in days (1-7).
 * @param source - Satellite source identifier (defaults to `"VIIRS_SNPP_NRT"`).
 * @returns A typed {@link FirmsResult} — success, unavailable, or error.
 *
 * @remarks
 * Responses are cached in memory for 10 minutes keyed on bbox + days + source.
 * The NASA FIRMS MAP key is read from `process.env.NASA_FIRMS_MAP_KEY` and is
 * **never** included in error messages returned to the client.
 */
export async function fetchFirmsFires(
  bbox: { west: number; south: number; east: number; north: number },
  days: number,
  source: string = DEFAULT_SOURCE,
): Promise<FirmsResult> {
  // ── Validate API key ──────────────────────────────────────────────────
  const apiKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!apiKey) {
    return {
      detections: [],
      source: "unavailable",
      message:
        "Detailed fire detections unavailable — FIRMS key not configured.",
    };
  }

  // ── Validate inputs ───────────────────────────────────────────────────
  const bboxError = validateBbox(bbox);
  if (bboxError) {
    return {
      detections: [],
      source,
      error: "Invalid bounding box",
      message: bboxError,
    };
  }

  const daysError = validateDays(days);
  if (daysError) {
    return {
      detections: [],
      source,
      error: "Invalid days parameter",
      message: daysError,
    };
  }

  // ── Check cache ───────────────────────────────────────────────────────
  const key = makeCacheKey(bbox, days, source);
  const cached = cacheGet(key);
  if (cached) return cached;

  // ── Fetch from FIRMS API ──────────────────────────────────────────────
  const { west, south, east, north } = bbox;
  const url = `${FIRMS_API_BASE}/${apiKey}/${source}/${west},${south},${east},${north}/${days}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "text/csv" },
      cache: "no-store",
    });
  } catch {
    return {
      detections: [],
      source,
      error: "Network error",
      message:
        "Unable to reach the FIRMS API. Please check your connection and try again.",
    };
  }

  if (!response.ok) {
    // Never include the raw response body in messages sent to the client —
    // it could contain the API key.  Provide a generic status-based message.
    return {
      detections: [],
      source,
      error: `FIRMS API returned status ${response.status}`,
      message:
        response.status === 401 || response.status === 403
          ? "The FIRMS API rejected the request. The API key may be invalid or expired."
          : response.status === 429
            ? "The FIRMS API rate limit has been exceeded. Please try again later."
            : response.status >= 500
              ? "The FIRMS API is experiencing an internal error. Please try again later."
              : "The FIRMS API returned an unexpected error. The request may be invalid or the service may be temporarily unavailable.",
    };
  }

  // ── Read response body ────────────────────────────────────────────────
  let csvText: string;
  try {
    csvText = await response.text();
  } catch {
    return {
      detections: [],
      source,
      error: "Response read error",
      message: "Failed to read the FIRMS API response body.",
    };
  }

  // ── Parse CSV ─────────────────────────────────────────────────────────
  let detections: FireDetection[];
  try {
    detections = parseFirmsCsv(csvText);
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "Unknown CSV parse error.";
    // Sanity-check: never leak the key even in parse-error details.
    const safeDetail = detail.includes(apiKey)
      ? "CSV parse error — response format was unexpected."
      : detail;
    return {
      detections: [],
      source,
      error: "CSV parse error",
      message: safeDetail,
    };
  }

  // ── Cache successful result ───────────────────────────────────────────
  cacheSet(key, detections, source);

  return { detections, source };
}
