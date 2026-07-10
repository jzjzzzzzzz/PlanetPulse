// ============================================================
// Planet Pulse — Geographic distance utilities
// ============================================================
//
// Pure Haversine great-circle distance. No external
// dependencies; works identically in Node.js, Edge, and
// browser runtimes.
// ============================================================

/** Earth's mean radius in kilometres (volumetric, IUGG). */
const EARTH_RADIUS_KM = 6371;

/** Minimum valid latitude (degrees). */
const MIN_LAT = -90;

/** Maximum valid latitude (degrees). */
const MAX_LAT = 90;

/** Minimum valid longitude (degrees). */
const MIN_LNG = -180;

/** Maximum valid longitude (degrees). */
const MAX_LNG = 180;

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

/** Convert degrees to radians. */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// -----------------------------------------------------------
// Haversine formula
// -----------------------------------------------------------

/**
 * Compute the great-circle distance between two points on the
 * Earth's surface using the **Haversine formula**.
 *
 * Given two latitude / longitude pairs (φ₁, λ₁) and (φ₂, λ₂),
 * the formula is:
 *
 * ```
 * a = sin²(Δφ / 2) + cos(φ₁) · cos(φ₂) · sin²(Δλ / 2)
 * c = 2 · atan2(√a, √(1 − a))
 * d = R · c
 * ```
 *
 * where:
 * - φ is latitude (radians)
 * - λ is longitude (radians)
 * - R is Earth's mean radius (6 371 km)
 * - d is the resulting distance in kilometres
 *
 * @param lat1  Latitude of point 1, in degrees. Must be in [-90, 90].
 * @param lng1  Longitude of point 1, in degrees. Must be in [-180, 180].
 * @param lat2  Latitude of point 2, in degrees. Must be in [-90, 90].
 * @param lng2  Longitude of point 2, in degrees. Must be in [-180, 180].
 * @returns Distance in kilometres (always >= 0).
 *
 * @throws {RangeError} If any coordinate is outside its valid range.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  // -----------------------------------------------------------
  // Input validation
  // -----------------------------------------------------------
  if (lat1 < MIN_LAT || lat1 > MAX_LAT) {
    throw new RangeError(
      `lat1 must be between ${MIN_LAT} and ${MAX_LAT}, got ${lat1}`,
    );
  }
  if (lng1 < MIN_LNG || lng1 > MAX_LNG) {
    throw new RangeError(
      `lng1 must be between ${MIN_LNG} and ${MAX_LNG}, got ${lng1}`,
    );
  }
  if (lat2 < MIN_LAT || lat2 > MAX_LAT) {
    throw new RangeError(
      `lat2 must be between ${MIN_LAT} and ${MAX_LAT}, got ${lat2}`,
    );
  }
  if (lng2 < MIN_LNG || lng2 > MAX_LNG) {
    throw new RangeError(
      `lng2 must be between ${MIN_LNG} and ${MAX_LNG}, got ${lng2}`,
    );
  }

  // -----------------------------------------------------------
  // Identical coordinates → zero distance (short-circuit)
  // -----------------------------------------------------------
  if (lat1 === lat2 && lng1 === lng2) {
    return 0;
  }

  // -----------------------------------------------------------
  // Haversine formula
  // -----------------------------------------------------------
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lng2 - lng1);

  const sinΔφ2 = Math.sin(Δφ / 2);
  const sinΔλ2 = Math.sin(Δλ / 2);

  const a =
    sinΔφ2 * sinΔφ2 + Math.cos(φ1) * Math.cos(φ2) * sinΔλ2 * sinΔλ2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_KM * c;

  return distance;
}
