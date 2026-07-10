// ============================================================
// Planet Pulse — Hotspot severity scoring
// ============================================================
//
// Deterministic scoring algorithm. No Date.now() inside any
// scoring function — callers pass a reference date so results
// are reproducible across SSR / testing / replays.
// ============================================================

import type { EventCategory } from "@/types/environment";

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export type HotspotInput = {
  /** Event category (required). */
  category: EventCategory;
  /** ISO-8601 last-updated timestamp, or null if unknown. */
  updatedAt: string | null;
  /** ISO-8601 start timestamp, or null if unknown. */
  startedAt: string | null;
  /** Numeric magnitude value, or null if unavailable. */
  magnitudeValue: number | null;
  /** Unit label for the magnitude value, or null if unavailable. */
  magnitudeUnit: string | null;
  /** Whether the event is still considered open/active. */
  isOpen?: boolean;
  /** Number of distinct observations feeding this event. */
  observationCount?: number;
  /** Count of nearby FIRMS fire-pixel detections. */
  nearbyFireCount?: number;
};

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

/**
 * Category base weights (0–30).
 *
 * Rationale: wildfires and volcanoes have the highest immediate
 * threat to life / property; storms, floods, and drought are
 * medium-severity; ice and catch-all "other" are lower priority.
 */
const CATEGORY_WEIGHTS: Record<EventCategory, number> = {
  wildfire: 25,
  volcano: 25,
  "severe-storm": 20,
  flood: 18,
  "dust-haze": 15,
  drought: 15,
  landslide: 15,
  "sea-lake-ice": 10,
  other: 10,
};

/** Maximum possible total score (clamped). */
const MAX_SCORE = 100;

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

/**
 * Compute the difference in hours between two Date objects.
 * Positive result means `ref` is later than `target`.
 */
function hoursBetween(ref: Date, target: Date): number {
  return (ref.getTime() - target.getTime()) / (1000 * 60 * 60);
}

/**
 * Safely parse an ISO-8601 string; returns null on failure.
 */
function tryParseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// -----------------------------------------------------------
// Scoring engine
// -----------------------------------------------------------

/**
 * Compute a deterministic hotspot severity score (0–100).
 *
 * @param event  The hotspot input data.
 * @param referenceDate  The "now" moment for recency calculations.
 *                       Defaults to the current wall-clock time but
 *                       **must** be passed explicitly for deterministic
 *                       results (SSR, tests, replays).
 * @returns An object with the numeric score and a list of human-readable
 *          explanations for each scoring factor.
 */
export function computeHotspotScore(
  event: HotspotInput,
  referenceDate: Date = new Date(),
): { score: number; explanation: string[] } {
  const explanations: string[] = [];
  let total = 0;

  // Apply defaults for optional fields.
  const isOpen = event.isOpen ?? true;
  const observationCount = event.observationCount ?? 1;
  const nearbyFireCount = event.nearbyFireCount ?? 0;

  // -----------------------------------------------------------
  // 1. Category base weight (0–30)
  // -----------------------------------------------------------
  const categoryWeight = CATEGORY_WEIGHTS[event.category];
  total += categoryWeight;

  // Map category keys to human-readable labels for explanations.
  const categoryLabel: Record<EventCategory, string> = {
    wildfire: "Active wildfire event",
    volcano: "Active volcano event",
    "severe-storm": "Severe storm activity",
    flood: "Flood event",
    drought: "Drought conditions",
    "dust-haze": "Dust / haze event",
    landslide: "Landslide event",
    "sea-lake-ice": "Sea / lake ice event",
    other: "Other environmental event",
  };
  explanations.push(categoryLabel[event.category]);

  // -----------------------------------------------------------
  // 2. Recency (0–25)
  //    Bucketed by hours since last update.
  //    Within 6 h → 25, 12 h → 22, 24 h → 18, 48 h → 12,
  //    72 h → 8, 7 d → 5, older → 2, unknown → 0.
  // -----------------------------------------------------------
  const updatedDate = tryParseDate(event.updatedAt);
  let recencyScore = 0;

  if (updatedDate) {
    const hoursAgo = hoursBetween(referenceDate, updatedDate);

    if (hoursAgo <= 6) {
      recencyScore = 25;
      explanations.push("Updated within the last 6 hours");
    } else if (hoursAgo <= 12) {
      recencyScore = 22;
      explanations.push("Updated within the last 12 hours");
    } else if (hoursAgo <= 24) {
      recencyScore = 18;
      explanations.push("Updated within the last 24 hours");
    } else if (hoursAgo <= 48) {
      recencyScore = 12;
      explanations.push("Updated within the last 48 hours");
    } else if (hoursAgo <= 72) {
      recencyScore = 8;
      explanations.push("Updated within the last 72 hours");
    } else if (hoursAgo <= 168) {
      // 7 days = 168 hours
      recencyScore = 5;
      explanations.push("Updated within the last 7 days");
    } else {
      recencyScore = 2;
      explanations.push("Data is more than 7 days old");
    }
  } else {
    // updatedAt is null or unparseable — treat as unknown.
    recencyScore = 0;
    explanations.push("Update time unknown");
  }

  total += recencyScore;

  // -----------------------------------------------------------
  // 3. Magnitude (0–15)
  //    Both value + unit present → 15.
  //    Only one present → 8.
  //    Neither present → 0 + explanation.
  // -----------------------------------------------------------
  const hasValue = event.magnitudeValue !== null;
  const hasUnit = event.magnitudeUnit !== null;

  if (hasValue && hasUnit) {
    total += 15;
    explanations.push(
      `Magnitude: ${event.magnitudeValue} ${event.magnitudeUnit}`,
    );
  } else if (hasValue || hasUnit) {
    total += 8;
    explanations.push("Partial magnitude data available");
  } else {
    // Neither present.
    total += 0;
    explanations.push("Magnitude data unavailable");
  }

  // -----------------------------------------------------------
  // 4. Open / closed status (0–10)
  // -----------------------------------------------------------
  if (isOpen) {
    total += 10;
    explanations.push("Event is currently active");
  } else {
    total += 0;
    explanations.push("Event is no longer active");
  }

  // -----------------------------------------------------------
  // 5. Observation count (0–10)
  //    >= 5 → 10, >= 3 → 7, >= 2 → 5, 1 → 3.
  // -----------------------------------------------------------
  let obsScore: number;
  if (observationCount >= 5) {
    obsScore = 10;
  } else if (observationCount >= 3) {
    obsScore = 7;
  } else if (observationCount >= 2) {
    obsScore = 5;
  } else {
    obsScore = 3; // exactly 1
  }
  total += obsScore;

  if (observationCount >= 3) {
    explanations.push("Multiple recent observations");
  }

  // -----------------------------------------------------------
  // 6. Nearby FIRMS fire-detection density (0–10)
  //    > 100 → 10, > 50 → 8, > 20 → 6, > 10 → 4, > 0 → 2, 0 → 0.
  // -----------------------------------------------------------
  let firmsScore: number;
  if (nearbyFireCount > 100) {
    firmsScore = 10;
  } else if (nearbyFireCount > 50) {
    firmsScore = 8;
  } else if (nearbyFireCount > 20) {
    firmsScore = 6;
  } else if (nearbyFireCount > 10) {
    firmsScore = 4;
  } else if (nearbyFireCount > 0) {
    firmsScore = 2;
  } else {
    firmsScore = 0;
  }
  total += firmsScore;

  if (nearbyFireCount > 10) {
    explanations.push("High fire-detection density nearby");
  } else if (nearbyFireCount > 0) {
    explanations.push("Fire detections in the area");
  }

  // -----------------------------------------------------------
  // Clamp & return
  // -----------------------------------------------------------
  return {
    score: Math.min(total, MAX_SCORE),
    explanation: explanations,
  };
}
