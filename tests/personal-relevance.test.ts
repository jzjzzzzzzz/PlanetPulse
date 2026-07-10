// ============================================================
// Planet Pulse — Tests for personal relevance scoring
// ============================================================

import { describe, it, expect } from "vitest";
import {
  computePersonalRelevance,
  type PersonalRelevanceInput,
} from "@/lib/scoring/personal-relevance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal PersonalRelevanceInput with defaults. */
function makeInput(
  overrides: Partial<PersonalRelevanceInput> = {},
): PersonalRelevanceInput {
  return {
    distanceKm: 75,
    hotspotScore: 60,
    recencyHours: 3,
    isDaytimeLocal: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computePersonalRelevance
// ---------------------------------------------------------------------------

describe("computePersonalRelevance", () => {
  // --- 1. Score bounds ---

  it("returns a score between 0 and 100", () => {
    const score = computePersonalRelevance(makeInput());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  // --- 2. Determinism ---

  it("produces the same score for identical inputs", () => {
    const input = makeInput();
    const a = computePersonalRelevance(input);
    const b = computePersonalRelevance(input);
    expect(a).toBe(b);
  });

  // --- 3. Proximity: closer distance scores higher ---

  it("scores closer distances higher than farther distances", () => {
    const close = computePersonalRelevance(makeInput({ distanceKm: 25 }));
    const far = computePersonalRelevance(makeInput({ distanceKm: 400 }));
    expect(close).toBeGreaterThan(far);
  });

  it("awards maximum proximity points for distances <= 50 km", () => {
    const veryClose = computePersonalRelevance(
      makeInput({ distanceKm: 50, hotspotScore: 0, recencyHours: null, isDaytimeLocal: false }),
    );
    // 45 (proximity) + 0 + 0 + 0 = 45
    expect(veryClose).toBe(45);
  });

  it("awards 35 proximity points for distances <= 100 km", () => {
    const nearby = computePersonalRelevance(
      makeInput({ distanceKm: 100, hotspotScore: 0, recencyHours: null, isDaytimeLocal: false }),
    );
    // 35 (proximity) + 0 + 0 + 0 = 35
    expect(nearby).toBe(35);
  });

  // --- 4. Null distance ---

  it("gives zero proximity score for null distance, reducing total significantly", () => {
    const withDistance = computePersonalRelevance(
      makeInput({ distanceKm: 50, hotspotScore: 0, recencyHours: null, isDaytimeLocal: false }),
    );
    const withoutDistance = computePersonalRelevance(
      makeInput({ distanceKm: null, hotspotScore: 0, recencyHours: null, isDaytimeLocal: false }),
    );
    expect(withDistance).toBeGreaterThan(withoutDistance);
    expect(withoutDistance).toBe(0);
  });

  // --- 5. Hotspot score contribution ---

  it("higher hotspot score contributes to higher relevance", () => {
    const lowSeverity = computePersonalRelevance(
      makeInput({ hotspotScore: 20, distanceKm: null, recencyHours: null, isDaytimeLocal: false }),
    );
    const highSeverity = computePersonalRelevance(
      makeInput({ hotspotScore: 80, distanceKm: null, recencyHours: null, isDaytimeLocal: false }),
    );
    expect(highSeverity).toBeGreaterThan(lowSeverity);
  });

  it("scales severity proportionally (30% weight)", () => {
    // severityScore = 0.3 * 100 = 30
    const score = computePersonalRelevance(
      makeInput({ hotspotScore: 100, distanceKm: null, recencyHours: null, isDaytimeLocal: false }),
    );
    expect(score).toBe(30);
  });

  // --- 6. Recency ---

  it("scores recent events higher than older ones", () => {
    const recent = computePersonalRelevance(
      makeInput({ recencyHours: 2, hotspotScore: 0, distanceKm: null, isDaytimeLocal: false }),
    );
    const old = computePersonalRelevance(
      makeInput({ recencyHours: 100, hotspotScore: 0, distanceKm: null, isDaytimeLocal: false }),
    );
    expect(recent).toBeGreaterThan(old);
  });

  it("awards 15 recency points for events < 6 hours old", () => {
    const score = computePersonalRelevance(
      makeInput({ recencyHours: 5, hotspotScore: 0, distanceKm: null, isDaytimeLocal: false }),
    );
    expect(score).toBe(15);
  });

  it("awards 0 recency points for null recency", () => {
    const score = computePersonalRelevance(
      makeInput({ recencyHours: null, hotspotScore: 0, distanceKm: null, isDaytimeLocal: false }),
    );
    expect(score).toBe(0);
  });

  // --- 7. Daytime context ---

  it("adds nighttime/daytime context to the score", () => {
    const daytime = computePersonalRelevance(
      makeInput({ isDaytimeLocal: true, hotspotScore: 0, distanceKm: null, recencyHours: null }),
    );
    const nighttime = computePersonalRelevance(
      makeInput({ isDaytimeLocal: false, hotspotScore: 0, distanceKm: null, recencyHours: null }),
    );
    // daytime with recencyHours null gets 5 points (daytime only, no recency bonus)
    expect(daytime).toBe(5);
    expect(nighttime).toBe(0);
  });

  it("awards full daytime context (10) when daytime and recent", () => {
    const score = computePersonalRelevance(
      makeInput({ isDaytimeLocal: true, recencyHours: 3, hotspotScore: 0, distanceKm: null }),
    );
    // recency < 6h → 15, daytime + recent → 10, total = 25
    expect(score).toBe(25);
  });

  // --- 8. All null / worst case ---

  it("returns a low but non-negative score when all values are at their worst", () => {
    const worst: PersonalRelevanceInput = {
      distanceKm: null,
      hotspotScore: 0,
      recencyHours: null,
      isDaytimeLocal: false,
    };

    const score = computePersonalRelevance(worst);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBe(0);
  });

  // --- 9. Clamping ---

  it("clamps score to a maximum of 100", () => {
    const maxedOut: PersonalRelevanceInput = {
      distanceKm: 10,
      hotspotScore: 100,
      recencyHours: 1,
      isDaytimeLocal: true,
    };

    const score = computePersonalRelevance(maxedOut);
    expect(score).toBeLessThanOrEqual(100);
  });

  // --- 10. Rounding ---

  it("returns an integer score (rounded)", () => {
    const score = computePersonalRelevance(makeInput());
    expect(Number.isInteger(score)).toBe(true);
  });
});
