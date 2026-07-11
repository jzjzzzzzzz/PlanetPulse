// ============================================================
// Planet Pulse — Combined importance scoring
//
// Blends global severity (hotspot score) with personal relevance
// (proximity to user) into a single "importance" score.
// Used for ranking events on the event detail pages.
// ============================================================

import type { EnvironmentalEvent } from "@/types/environment";
import { computeHotspotScore, type HotspotInput } from "@/lib/scoring/hotspot-score";
import {
  computePersonalRelevance,
  type PersonalRelevanceInput,
} from "@/lib/scoring/personal-relevance";
import { haversineDistance } from "@/lib/geo/distance";
import { getHoursSince } from "@/lib/formatting/date";

// ============================================================
// Types
// ============================================================

export type ImportanceInput = {
  event: EnvironmentalEvent;
  userLat: number | null;
  userLng: number | null;
  referenceDate?: Date;
};

export type ImportanceResult = {
  /** Combined importance score (0–100) */
  score: number;
  /** Global hotspot severity (0–100) */
  hotspotScore: number;
  /** Personal relevance to user (0–100, 0 if no location) */
  personalScore: number;
  /** Distance from user in km (null if no location) */
  distanceKm: number | null;
  /** Human-readable explanation */
  explanation: string[];
  /** Importance tier */
  tier: "critical" | "high" | "medium" | "low";
};

// ============================================================
// Weight configuration
// ============================================================

/** Weight for global severity vs personal proximity */
const GLOBAL_WEIGHT = 0.4;
const PERSONAL_WEIGHT = 0.6;

// ============================================================
// Scoring engine
// ============================================================

/**
 * Compute a combined importance score that blends:
 * - Global hotspot severity (40%)
 * - Personal proximity relevance (60%)
 *
 * When user location is unavailable, falls back to 100% global score.
 */
export function computeImportance(input: ImportanceInput): ImportanceResult {
  const { event, userLat, userLng, referenceDate } = input;
  const now = referenceDate ?? new Date();
  const explanations: string[] = [];

  // 1. Global hotspot score — use pre-computed if available
  const hotspotScore = event.hotspotScore ?? (() => {
    const hotspotInput: HotspotInput = {
      category: event.category,
      updatedAt: event.updatedAt,
      startedAt: event.startedAt,
      magnitudeValue: event.magnitudeValue,
      magnitudeUnit: event.magnitudeUnit,
      isOpen: true,
      observationCount: event.observations?.length ?? 1,
    };
    return computeHotspotScore(hotspotInput, now).score;
  })();
  const hotspotExplanations = event.scoreExplanation ?? [];
  explanations.push(...hotspotExplanations);

  // 2. Personal relevance
  let distanceKm: number | null = null;
  let personalScore = 0;

  if (userLat != null && userLng != null) {
    distanceKm = haversineDistance(userLat, userLng, event.latitude, event.longitude);

    const recencyHours = event.updatedAt
      ? getHoursSince(event.updatedAt, now)
      : null;

    const isDaytime =
      userLat != null
        ? (() => {
            const hour = now.getHours();
            return hour >= 6 && hour < 20;
          })()
        : null;

    const personalInput: PersonalRelevanceInput = {
      distanceKm,
      hotspotScore,
      recencyHours,
      isDaytimeLocal: isDaytime,
    };
    personalScore = computePersonalRelevance(personalInput);

    if (distanceKm < 50) {
      explanations.push(`Within 50 km of your location`);
    } else if (distanceKm < 250) {
      explanations.push(`Within 250 km (${Math.round(distanceKm)} km away)`);
    } else if (distanceKm < 1000) {
      explanations.push(`${Math.round(distanceKm)} km from your location`);
    }
  } else {
    explanations.push("Location unavailable — global severity only");
  }

  // 3. Blend
  let combined: number;
  if (userLat != null && userLng != null) {
    combined = GLOBAL_WEIGHT * hotspotScore + PERSONAL_WEIGHT * personalScore;
  } else {
    combined = hotspotScore; // 100% global when no location
  }

  const score = Math.min(100, Math.max(0, Math.round(combined)));

  // 4. Tier
  let tier: ImportanceResult["tier"];
  if (score >= 80) tier = "critical";
  else if (score >= 55) tier = "high";
  else if (score >= 30) tier = "medium";
  else tier = "low";

  return {
    score,
    hotspotScore,
    personalScore,
    distanceKm,
    explanation: explanations,
    tier,
  };
}

/**
 * Sort events by combined importance, prioritizing closest + most severe.
 */
export function rankByImportance(
  events: EnvironmentalEvent[],
  userLat: number | null,
  userLng: number | null,
): { event: EnvironmentalEvent; importance: ImportanceResult }[] {
  return events
    .map((event) => ({
      event,
      importance: computeImportance({ event, userLat, userLng }),
    }))
    .sort((a, b) => b.importance.score - a.importance.score);
}

/**
 * Get the top-N most important events (global ranking).
 */
export function topGlobalEvents(
  events: EnvironmentalEvent[],
  n: number = 8,
): { event: EnvironmentalEvent; importance: ImportanceResult }[] {
  return rankByImportance(events, null, null).slice(0, n);
}

/**
 * Get the top-N events closest to the user.
 */
export function topNearbyEvents(
  events: EnvironmentalEvent[],
  userLat: number,
  userLng: number,
  n: number = 8,
): { event: EnvironmentalEvent; importance: ImportanceResult }[] {
  return rankByImportance(events, userLat, userLng).slice(0, n);
}
