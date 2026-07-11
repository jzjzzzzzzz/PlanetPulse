import { describe, it, expect } from "vitest";
import { computeImportance, rankByImportance } from "@/lib/scoring/importance";
import type { EnvironmentalEvent } from "@/types/environment";

// Build a minimal event for testing
function makeEvent(overrides: Partial<EnvironmentalEvent> = {}): EnvironmentalEvent {
  return {
    id: "test-001",
    title: "Test Wildfire",
    category: "wildfire",
    latitude: 34.0,
    longitude: -118.0,
    startedAt: "2026-07-10T00:00:00Z",
    updatedAt: "2026-07-11T00:00:00Z",
    sourceName: "NASA EONET",
    sourceUrl: "https://eonet.gsfc.nasa.gov/",
    geometryType: "Point",
    magnitudeValue: 5000,
    magnitudeUnit: "acres",
    hotspotScore: 75,
    scoreExplanation: ["Active wildfire", "Updated recently"],
    observations: [
      { observedAt: "2026-07-10T00:00:00Z", latitude: 34.0, longitude: -118.0, magnitudeValue: 3000, magnitudeUnit: "acres" },
      { observedAt: "2026-07-11T00:00:00Z", latitude: 34.0, longitude: -118.0, magnitudeValue: 5000, magnitudeUnit: "acres" },
    ],
    ...overrides,
  };
}

describe("computeImportance", () => {
  it("returns hotspot-only score when no user location", () => {
    const event = makeEvent();
    const result = computeImportance({ event, userLat: null, userLng: null });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.personalScore).toBe(0);
    expect(result.distanceKm).toBeNull();
  });

  it("blends hotspot + personal when user location provided", () => {
    const event = makeEvent();
    const result = computeImportance({ event, userLat: 34.5, userLng: -118.5 });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.personalScore).toBeGreaterThan(0); // nearby
    expect(result.distanceKm).not.toBeNull();
    expect(result.distanceKm!).toBeLessThan(100);
  });

  it("nearby events get higher personal score", () => {
    const near = makeEvent({ id: "near", latitude: 34.1, longitude: -118.1 });
    const far = makeEvent({ id: "far", latitude: 50.0, longitude: 0.0 });

    const nearResult = computeImportance({ event: near, userLat: 34.0, userLng: -118.0 });
    const farResult = computeImportance({ event: far, userLat: 34.0, userLng: -118.0 });

    expect(nearResult.personalScore).toBeGreaterThan(farResult.personalScore);
    expect(nearResult.score).toBeGreaterThan(farResult.score);
  });

  it("assigns tier correctly", () => {
    const low = makeEvent({ hotspotScore: 10 });
    const med = makeEvent({ hotspotScore: 45 });
    const high = makeEvent({ hotspotScore: 70 });
    const crit = makeEvent({ hotspotScore: 92 });

    expect(computeImportance({ event: low, userLat: null, userLng: null }).tier).toBe("low");
    expect(computeImportance({ event: med, userLat: null, userLng: null }).tier).toBe("medium");
    expect(computeImportance({ event: high, userLat: null, userLng: null }).tier).toBe("high");
    expect(computeImportance({ event: crit, userLat: null, userLng: null }).tier).toBe("critical");
  });

  it("includes human-readable explanations", () => {
    const event = makeEvent();
    const result = computeImportance({ event, userLat: 34.0, userLng: -118.0 });
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.explanation.some((e) => e.includes("Active wildfire"))).toBe(true);
  });

  it("explanation notes location missing", () => {
    const result = computeImportance({ event: makeEvent(), userLat: null, userLng: null });
    expect(result.explanation.some((e) => e.includes("unavailable"))).toBe(true);
  });
});

describe("rankByImportance", () => {
  it("sorts by importance descending", () => {
    const events = [
      makeEvent({ id: "a", hotspotScore: 30 }),
      makeEvent({ id: "b", hotspotScore: 80 }),
      makeEvent({ id: "c", hotspotScore: 55 }),
    ];
    const ranked = rankByImportance(events, null, null);
    expect(ranked[0].event.id).toBe("b");
    expect(ranked[2].event.id).toBe("a");
  });

  it("nearby events rank higher with user location", () => {
    const events = [
      makeEvent({ id: "far", latitude: 50, longitude: 0, hotspotScore: 80 }),
      makeEvent({ id: "near", latitude: 34.1, longitude: -118.1, hotspotScore: 50 }),
    ];
    const ranked = rankByImportance(events, 34.0, -118.0);
    // Nearby should rank higher despite lower hotspot score
    expect(ranked[0].event.id).toBe("near");
  });

  it("handles empty array", () => {
    const ranked = rankByImportance([], null, null);
    expect(ranked).toHaveLength(0);
  });

  it("handles single event", () => {
    const ranked = rankByImportance([makeEvent()], null, null);
    expect(ranked).toHaveLength(1);
  });
});
