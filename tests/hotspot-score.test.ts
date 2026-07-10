// ============================================================
// Planet Pulse — Tests for hotspot severity scoring
// ============================================================

import { describe, it, expect } from "vitest";
import { computeHotspotScore, type HotspotInput } from "@/lib/scoring/hotspot-score";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fixed reference date for deterministic tests. */
const REFERENCE_DATE = new Date("2024-06-15T12:00:00Z");

/** Create a minimal hotspot input with defaults. */
function makeInput(overrides: Partial<HotspotInput> = {}): HotspotInput {
  return {
    category: "wildfire",
    updatedAt: "2024-06-15T09:00:00Z", // 3 hours before reference
    startedAt: "2024-06-14T00:00:00Z",
    magnitudeValue: 5.5,
    magnitudeUnit: "km2",
    isOpen: true,
    observationCount: 3,
    nearbyFireCount: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeHotspotScore
// ---------------------------------------------------------------------------

describe("computeHotspotScore", () => {
  // --- 1. Score bounds ---

  it("returns a score between 0 and 100", () => {
    const result = computeHotspotScore(makeInput(), REFERENCE_DATE);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  // --- 2. Determinism ---

  it("produces the same score for identical inputs", () => {
    const input = makeInput();
    const a = computeHotspotScore(input, REFERENCE_DATE);
    const b = computeHotspotScore(input, REFERENCE_DATE);
    expect(a.score).toBe(b.score);
    expect(a.explanation).toEqual(b.explanation);
  });

  // --- 3. Category weight ---

  it("assigns wildfire the highest category weight among common categories", () => {
    const wildfire = makeInput({ category: "wildfire" });
    const other = makeInput({ category: "other" });

    const wildfireResult = computeHotspotScore(wildfire, REFERENCE_DATE);
    const otherResult = computeHotspotScore(other, REFERENCE_DATE);

    expect(wildfireResult.score).toBeGreaterThan(otherResult.score);
  });

  // --- 4. Magnitude ---

  it("scores lower for events with no magnitude data", () => {
    const withMagnitude = makeInput({
      magnitudeValue: 5.5,
      magnitudeUnit: "km2",
    });
    const withoutMagnitude = makeInput({
      magnitudeValue: null,
      magnitudeUnit: null,
    });

    const withResult = computeHotspotScore(withMagnitude, REFERENCE_DATE);
    const withoutResult = computeHotspotScore(withoutMagnitude, REFERENCE_DATE);

    expect(withResult.score).toBeGreaterThan(withoutResult.score);
  });

  it("awards partial points when only magnitude value or unit is present", () => {
    const valueOnly = makeInput({ magnitudeValue: 5.5, magnitudeUnit: null });
    const unitOnly = makeInput({ magnitudeValue: null, magnitudeUnit: "km2" });

    const valueResult = computeHotspotScore(valueOnly, REFERENCE_DATE);
    const unitResult = computeHotspotScore(unitOnly, REFERENCE_DATE);

    // Both partial cases get 8 points (vs 15 for full, 0 for none)
    expect(valueResult.score).toBe(unitResult.score);
  });

  // --- 5. Observation count ---

  it("scores higher for events with more observations", () => {
    const lowObs = makeInput({ observationCount: 1 });
    const highObs = makeInput({ observationCount: 10 });

    const lowResult = computeHotspotScore(lowObs, REFERENCE_DATE);
    const highResult = computeHotspotScore(highObs, REFERENCE_DATE);

    expect(highResult.score).toBeGreaterThan(lowResult.score);
  });

  // --- 6. Nearby fires ---

  it("scores higher for events with more nearby fire detections", () => {
    const noFires = makeInput({ nearbyFireCount: 0 });
    const manyFires = makeInput({ nearbyFireCount: 200 });

    const noResult = computeHotspotScore(noFires, REFERENCE_DATE);
    const manyResult = computeHotspotScore(manyFires, REFERENCE_DATE);

    expect(manyResult.score).toBeGreaterThan(noResult.score);
  });

  // --- 7. Recency ---

  it("scores old events lower than recent ones", () => {
    const recent = makeInput({ updatedAt: "2024-06-15T11:00:00Z" }); // 1 hour before ref
    const old = makeInput({ updatedAt: "2024-06-01T00:00:00Z" }); // 14 days before ref

    const recentResult = computeHotspotScore(recent, REFERENCE_DATE);
    const oldResult = computeHotspotScore(old, REFERENCE_DATE);

    expect(recentResult.score).toBeGreaterThan(oldResult.score);
  });

  // --- 8. "other" category ---

  it('scores "other" category lower than major categories', () => {
    const other = makeInput({ category: "other" });
    const wildfire = makeInput({ category: "wildfire" });

    const otherResult = computeHotspotScore(other, REFERENCE_DATE);
    const wildfireResult = computeHotspotScore(wildfire, REFERENCE_DATE);

    expect(wildfireResult.score).toBeGreaterThan(otherResult.score);
  });

  // --- 9. Explanation array ---

  it("returns a non-empty explanation array", () => {
    const result = computeHotspotScore(makeInput(), REFERENCE_DATE);
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it("includes the category label in the explanation", () => {
    const result = computeHotspotScore(makeInput({ category: "wildfire" }), REFERENCE_DATE);
    expect(result.explanation[0]).toBe("Active wildfire event");
  });

  // --- 10. Deterministic with fixed reference date ---

  it("is deterministic with a fixed reference date across multiple calls", () => {
    const input = makeInput();
    const results = Array.from({ length: 10 }, () =>
      computeHotspotScore(input, REFERENCE_DATE),
    );

    const firstScore = results[0].score;
    for (const r of results) {
      expect(r.score).toBe(firstScore);
    }
  });

  // --- Additional edge cases ---

  it("handles null updatedAt gracefully", () => {
    const input = makeInput({ updatedAt: null });
    const result = computeHotspotScore(input, REFERENCE_DATE);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.explanation).toContain("Update time unknown");
  });

  it("handles closed events with lower score than open ones", () => {
    const open = makeInput({ isOpen: true });
    const closed = makeInput({ isOpen: false });

    const openResult = computeHotspotScore(open, REFERENCE_DATE);
    const closedResult = computeHotspotScore(closed, REFERENCE_DATE);

    expect(openResult.score).toBeGreaterThan(closedResult.score);
  });

  it("clamps score to a maximum of 100", () => {
    // Provide inputs that would exceed 100 without clamping
    const maxedOut = makeInput({
      category: "wildfire",
      updatedAt: "2024-06-15T11:59:00Z", // within 6h → 25 recency
      magnitudeValue: 9.9,
      magnitudeUnit: "Mw",
      isOpen: true,
      observationCount: 10,
      nearbyFireCount: 200,
    });

    const result = computeHotspotScore(maxedOut, REFERENCE_DATE);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns the minimum possible score for worst-case inputs", () => {
    const worst: HotspotInput = {
      category: "other",
      updatedAt: null,
      startedAt: null,
      magnitudeValue: null,
      magnitudeUnit: null,
      isOpen: false,
      observationCount: 1,
      nearbyFireCount: 0,
    };

    const result = computeHotspotScore(worst, REFERENCE_DATE);
    // other(10) + recency(0) + magnitude(0) + closed(0) + obs(3) + firms(0) = 13
    expect(result.score).toBe(13);
  });
});
