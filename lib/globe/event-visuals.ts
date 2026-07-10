// ============================================================
// Planet Pulse — Globe event visualisation utilities
//
// Deterministic, pure functions. No random(), no Date.now().
// Same input → same output, every time.
// ============================================================

import type { EventCategory, EventObservation } from "@/types/environment";

// ============================================================
// Category → colour
// ============================================================

/** Hex colours for each event category (used on 3D globe markers). */
const CATEGORY_HEX: Record<EventCategory, string> = {
  wildfire: "#FF6B35",
  "severe-storm": "#9B7BFF",
  volcano: "#FF435D",
  flood: "#3BD5FF",
  drought: "#D4A843",
  "dust-haze": "#B09E80",
  landslide: "#C7926B",
  "sea-lake-ice": "#8ED6E5",
  other: "#8D9AAF",
};

/** Return the hex colour for an event category. */
export function getEventColor(category: EventCategory): string {
  return CATEGORY_HEX[category] ?? CATEGORY_HEX.other;
}

// ============================================================
// Point size (deterministic, bounded)
// ============================================================

const MIN_POINT_RADIUS = 0.08;
const MAX_POINT_RADIUS = 0.35;

/** Map a hotspot score to a bounded globe-point radius. */
export function getPointRadius(score: number): number {
  // Clamp score to [0, 100] and linearly interpolate
  const clamped = Math.max(0, Math.min(100, score));
  return MIN_POINT_RADIUS + (clamped / 100) * (MAX_POINT_RADIUS - MIN_POINT_RADIUS);
}

// ============================================================
// Point altitude (deterministic, bounded)
// ============================================================

const PT_MIN_ALTITUDE = 0.02;
const PT_MAX_ALTITUDE = 0.18;

/** Map a hotspot score to a bounded globe-point altitude above surface. */
export function getPointAltitude(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return PT_MIN_ALTITUDE + (clamped / 100) * (PT_MAX_ALTITUDE - PT_MIN_ALTITUDE);
}

// ============================================================
// Ring thresholds
// ============================================================

/**
 * Severity tier from a hotspot score.
 *
 *   0–39   → "low"
 *   40–69  → "medium"
 *   70–84  → "high"
 *   85–100 → "severe"
 */
export type SeverityTier = "low" | "medium" | "high" | "severe";

export function getSeverityTier(score: number): SeverityTier {
  if (score >= 85) return "severe";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** Whether this score should show an animated ring on the globe. */
export function shouldShowRing(score: number): boolean {
  return getSeverityTier(score) !== "low";
}

/** Ring outer radius for a given score (bounded, deterministic). */
export function getRingRadius(score: number): number {
  const tier = getSeverityTier(score);
  switch (tier) {
    case "severe":
      return 0.65;
    case "high":
      return 0.45;
    case "medium":
      return 0.28;
    default:
      return 0;
  }
}

/** Ring animation cycle duration in milliseconds (faster = higher severity). */
export function getRingSpeed(score: number): number {
  const tier = getSeverityTier(score);
  switch (tier) {
    case "severe":
      return 2000;
    case "high":
      return 2800;
    case "medium":
      return 3800;
    default:
      return 0;
  }
}

// ============================================================
// Selected event visual scaling
// ============================================================

/** Scale multiplier for the selected marker point radius. */
export const SELECTED_SCALE = 1.6;

/** Scale multiplier for the selected marker altitude. */
export const SELECTED_ALTITUDE_SCALE = 2.0;

// ============================================================
// Observation history paths
// ============================================================

/** A point on the globe surface for observation-history rendering. */
export type HistoryPoint = {
  lat: number;
  lng: number;
  /** 0 = oldest, 1 = newest */
  progress: number;
};

/**
 * Convert observations to globe-surface history points.
 *
 * - rejects invalid coordinates (NaN, out of range)
 * - normalises progress to [0, 1] chronologically
 * - returns at most `maxPoints` entries (evenly sampled)
 */
export function prepareHistoryPath(
  observations: EventObservation[],
  maxPoints: number = 30,
): HistoryPoint[] {
  if (!observations.length) return [];

  const valid: HistoryPoint[] = [];

  for (const obs of observations) {
    const lat = obs.latitude;
    const lng = obs.longitude;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      continue;
    }
    valid.push({ lat, lng, progress: 0 });
  }

  if (!valid.length) return [];

  // Normalise progress
  if (valid.length === 1) {
    valid[0].progress = 1;
    return valid;
  }

  for (let i = 0; i < valid.length; i++) {
    valid[i].progress = i / (valid.length - 1);
  }

  // Downsample if needed
  if (valid.length <= maxPoints) return valid;

  const step = (valid.length - 1) / (maxPoints - 1);
  const sampled: HistoryPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    sampled.push(valid[Math.round(i * step)]);
  }
  return sampled;
}

// ============================================================
// User location marker
// ============================================================

export const USER_MARKER_COLOR = "#45A3FF";
export const USER_MARKER_RADIUS = 0.11;
export const USER_MARKER_RING_RADIUS = 0.22;
export const USER_MARKER_RING_COLOR = "rgba(69, 163, 255, 0.4)";

// ============================================================
// Globe camera defaults
// ============================================================

/** Default camera altitude (planet radii from surface). */
export const DEFAULT_ALTITUDE = 2.5;
/** Minimum zoom distance (prevent zooming inside the Earth). */
export const MIN_ALTITUDE = 1.2;
/** Maximum zoom distance. */
export const MAX_ALTITUDE = 6.0;
/** Auto-rotation speed (radians per second). */
export const AUTO_ROTATE_SPEED = 0.25;
/** Focus animation duration (ms). */
export const FOCUS_DURATION_MS = 1000;
/** Reduced-motion focus duration (ms). */
export const FOCUS_DURATION_REDUCED_MS = 0;
