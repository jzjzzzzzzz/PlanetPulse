// ============================================================
// Planet Pulse — Personal relevance scoring
// ============================================================
//
// Determines how personally relevant a hotspot is to a given
// user based on proximity, severity, recency, and local time.
//
// All scoring is deterministic — no randomness, no Date.now().
// ============================================================

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export type PersonalRelevanceInput = {
  /** Straight-line distance from the user to the hotspot, in km.
   *  null when the user's location is unavailable. */
  distanceKm: number | null;
  /** The hotspot's severity score (0–100) from computeHotspotScore(). */
  hotspotScore: number;
  /** Hours since the hotspot data was last updated.
   *  null when the update time is unknown. */
  recencyHours: number | null;
  /** Whether it is daytime at the user's local time (6 AM – 8 PM).
   *  null when the local timezone cannot be determined. */
  isDaytimeLocal: boolean | null;
};

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

/** Earth's mean radius in kilometres (used only for documentation). */
const MAX_RELEVANCE = 100;

// -----------------------------------------------------------
// Scoring engine
// -----------------------------------------------------------

/**
 * Compute a deterministic personal-relevance score (0–100).
 *
 * The score is a weighted blend of four factors:
 *
 * ### Proximity (45%)
 * Inverse-distance bucketing:
 *   within   50 km → 45 points
 *   within  100 km → 35 points
 *   within  250 km → 25 points
 *   within  500 km → 15 points
 *   within 1000 km →  5 points
 *   beyond / null  →  0 points
 *
 * ### Global hotspot severity (30%)
 * Scaled proportionally: `0.3 * hotspotScore`.
 *
 * ### Data recency (15%)
 * Bucketed by hours since last update:
 *   <  6 h → 15 points
 *   < 12 h → 12 points
 *   < 24 h →  9 points
 *   < 48 h →  5 points
 *   < 72 h →  2 points
 *   older / null → 0 points
 *
 * ### Matching local time context (10%)
 * Helps surface events when the user is awake:
 *   daytime (6 AM – 8 PM) AND recency < 24 h  → 10 points
 *   daytime only                               →  5 points
 *   nighttime or unknown                       →  0 points
 *
 * The final sum is clamped to [0, 100].
 *
 * @param params  The input data for the relevance calculation.
 * @returns A number between 0 and 100 inclusive.
 */
export function computePersonalRelevance(
  params: PersonalRelevanceInput,
): number {
  const { distanceKm, hotspotScore, recencyHours, isDaytimeLocal } = params;

  // ---------------------------------------------------------
  // 1. Proximity (45% weight)
  //    Inverse distance — closer = more relevant.
  // ---------------------------------------------------------
  let proximityScore: number;

  if (distanceKm === null) {
    proximityScore = 0;
  } else if (distanceKm <= 50) {
    proximityScore = 45;
  } else if (distanceKm <= 100) {
    proximityScore = 35;
  } else if (distanceKm <= 250) {
    proximityScore = 25;
  } else if (distanceKm <= 500) {
    proximityScore = 15;
  } else if (distanceKm <= 1000) {
    proximityScore = 5;
  } else {
    proximityScore = 0;
  }

  // ---------------------------------------------------------
  // 2. Global hotspot severity (30% weight)
  //    Higher-severity events are more relevant regardless of
  //    distance.
  // ---------------------------------------------------------
  const severityScore = 0.3 * hotspotScore;

  // ---------------------------------------------------------
  // 3. Data recency (15% weight)
  //    Fresher data is more actionable and relevant.
  // ---------------------------------------------------------
  let recencyScore: number;

  if (recencyHours === null) {
    recencyScore = 0;
  } else if (recencyHours < 6) {
    recencyScore = 15;
  } else if (recencyHours < 12) {
    recencyScore = 12;
  } else if (recencyHours < 24) {
    recencyScore = 9;
  } else if (recencyHours < 48) {
    recencyScore = 5;
  } else if (recencyHours < 72) {
    recencyScore = 2;
  } else {
    recencyScore = 0;
  }

  // ---------------------------------------------------------
  // 4. Matching local time context (10% weight)
  //    Users care more about timely events during waking hours.
  // ---------------------------------------------------------
  let localTimeScore: number;

  if (isDaytimeLocal === true) {
    // Daytime is defined as 6 AM – 8 PM local time.
    if (recencyHours !== null && recencyHours < 24) {
      localTimeScore = 10;
    } else {
      localTimeScore = 5;
    }
  } else {
    // Nighttime or unknown.
    localTimeScore = 0;
  }

  // ---------------------------------------------------------
  // Combine & clamp
  // ---------------------------------------------------------
  const raw = proximityScore + severityScore + recencyScore + localTimeScore;

  return Math.min(MAX_RELEVANCE, Math.max(0, Math.round(raw)));
}
