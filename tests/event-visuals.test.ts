// ============================================================
// Planet Pulse — Tests for globe event-visuals utilities
// ============================================================

import { describe, it, expect } from "vitest";
import {
  getEventColor,
  getPointRadius,
  getPointAltitude,
  getSeverityTier,
  shouldShowRing,
  getRingRadius,
  getRingSpeed,
  prepareHistoryPath,
} from "@/lib/globe/event-visuals";

// ============================================================
// getEventColor
// ============================================================

describe("getEventColor", () => {
  it("returns wildfire colour for wildfire category", () => {
    expect(getEventColor("wildfire")).toBe("#FF6B35");
  });

  it("returns storm colour for severe-storm", () => {
    expect(getEventColor("severe-storm")).toBe("#9B7BFF");
  });

  it("returns volcano colour for volcano", () => {
    expect(getEventColor("volcano")).toBe("#FF435D");
  });

  it("returns flood colour for flood", () => {
    expect(getEventColor("flood")).toBe("#3BD5FF");
  });

  it("returns other colour for unrecognized category", () => {
    expect(getEventColor("other")).toBe("#8D9AAF");
  });

  it("is deterministic — same input returns same output", () => {
    expect(getEventColor("wildfire")).toBe(getEventColor("wildfire"));
    expect(getEventColor("drought")).toBe(getEventColor("drought"));
  });
});

// ============================================================
// getPointRadius
// ============================================================

describe("getPointRadius", () => {
  it("returns minimum radius for score 0", () => {
    const r = getPointRadius(0);
    expect(r).toBeGreaterThanOrEqual(0.08);
    expect(r).toBeLessThanOrEqual(0.1);
  });

  it("returns maximum radius for score 100", () => {
    const r = getPointRadius(100);
    expect(r).toBeGreaterThanOrEqual(0.3);
    expect(r).toBeLessThanOrEqual(0.35);
  });

  it("returns monotonically increasing values", () => {
    expect(getPointRadius(50)).toBeGreaterThan(getPointRadius(0));
    expect(getPointRadius(100)).toBeGreaterThan(getPointRadius(50));
  });

  it("clamps scores above 100", () => {
    expect(getPointRadius(200)).toBe(getPointRadius(100));
  });

  it("clamps scores below 0", () => {
    expect(getPointRadius(-50)).toBe(getPointRadius(0));
  });

  it("is deterministic", () => {
    expect(getPointRadius(42)).toBe(getPointRadius(42));
  });
});

// ============================================================
// getPointAltitude
// ============================================================

describe("getPointAltitude", () => {
  it("returns minimum altitude for score 0", () => {
    expect(getPointAltitude(0)).toBe(0.02);
  });

  it("returns maximum altitude for score 100", () => {
    expect(getPointAltitude(100)).toBe(0.18);
  });

  it("returns monotonically increasing values", () => {
    expect(getPointAltitude(50)).toBeGreaterThan(getPointAltitude(0));
    expect(getPointAltitude(100)).toBeGreaterThan(getPointAltitude(50));
  });

  it("clamps to bounds", () => {
    expect(getPointAltitude(200)).toBe(getPointAltitude(100));
    expect(getPointAltitude(-10)).toBe(getPointAltitude(0));
  });
});

// ============================================================
// getSeverityTier
// ============================================================

describe("getSeverityTier", () => {
  it("returns low for scores below 40", () => {
    expect(getSeverityTier(0)).toBe("low");
    expect(getSeverityTier(39)).toBe("low");
  });

  it("returns medium for scores 40-69", () => {
    expect(getSeverityTier(40)).toBe("medium");
    expect(getSeverityTier(69)).toBe("medium");
  });

  it("returns high for scores 70-84", () => {
    expect(getSeverityTier(70)).toBe("high");
    expect(getSeverityTier(84)).toBe("high");
  });

  it("returns severe for scores 85+", () => {
    expect(getSeverityTier(85)).toBe("severe");
    expect(getSeverityTier(100)).toBe("severe");
  });
});

// ============================================================
// shouldShowRing
// ============================================================

describe("shouldShowRing", () => {
  it("returns false for low scores", () => {
    expect(shouldShowRing(0)).toBe(false);
    expect(shouldShowRing(39)).toBe(false);
  });

  it("returns true for medium and above", () => {
    expect(shouldShowRing(40)).toBe(true);
    expect(shouldShowRing(70)).toBe(true);
    expect(shouldShowRing(100)).toBe(true);
  });
});

// ============================================================
// getRingRadius
// ============================================================

describe("getRingRadius", () => {
  it("returns 0 for low severity", () => {
    expect(getRingRadius(30)).toBe(0);
  });

  it("returns medium radius for medium severity", () => {
    expect(getRingRadius(50)).toBe(0.28);
  });

  it("returns large radius for high severity", () => {
    expect(getRingRadius(75)).toBe(0.45);
  });

  it("returns largest radius for severe", () => {
    expect(getRingRadius(90)).toBe(0.65);
  });
});

// ============================================================
// getRingSpeed
// ============================================================

describe("getRingSpeed", () => {
  it("returns 0 for low severity", () => {
    expect(getRingSpeed(10)).toBe(0);
  });

  it("severe is faster than high", () => {
    expect(getRingSpeed(90)).toBeLessThan(getRingSpeed(75));
  });

  it("high is faster than medium", () => {
    expect(getRingSpeed(75)).toBeLessThan(getRingSpeed(50));
  });
});

// ============================================================
// prepareHistoryPath
// ============================================================

describe("prepareHistoryPath", () => {
  it("returns empty array for empty observations", () => {
    expect(prepareHistoryPath([])).toEqual([]);
  });

  it("returns single point with progress 1", () => {
    const result = prepareHistoryPath([
      { observedAt: "2026-01-01T00:00:00Z", latitude: 10, longitude: 20, magnitudeValue: null, magnitudeUnit: null },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].progress).toBe(1);
    expect(result[0].lat).toBe(10);
    expect(result[0].lng).toBe(20);
  });

  it("rejects NaN coordinates", () => {
    const result = prepareHistoryPath([
      { observedAt: "2026-01-01T00:00:00Z", latitude: NaN, longitude: 20, magnitudeValue: null, magnitudeUnit: null },
      { observedAt: "2026-01-02T00:00:00Z", latitude: 10, longitude: 20, magnitudeValue: null, magnitudeUnit: null },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].lat).toBe(10);
  });

  it("rejects out-of-range coordinates", () => {
    expect(prepareHistoryPath([
      { observedAt: null, latitude: 91, longitude: 0, magnitudeValue: null, magnitudeUnit: null },
    ])).toHaveLength(0);
    expect(prepareHistoryPath([
      { observedAt: null, latitude: 0, longitude: -181, magnitudeValue: null, magnitudeUnit: null },
    ])).toHaveLength(0);
  });

  it("progress ranges from 0 to 1", () => {
    const obs = [
      { observedAt: null, latitude: 0, longitude: 0, magnitudeValue: null, magnitudeUnit: null },
      { observedAt: null, latitude: 10, longitude: 10, magnitudeValue: null, magnitudeUnit: null },
      { observedAt: null, latitude: 20, longitude: 20, magnitudeValue: null, magnitudeUnit: null },
    ];
    const result = prepareHistoryPath(obs);
    expect(result[0].progress).toBe(0);
    expect(result[result.length - 1].progress).toBe(1);
  });

  it("downsamples when exceeding maxPoints", () => {
    const obs = Array.from({ length: 100 }, (_, i) => ({
      observedAt: null,
      latitude: i * 0.5,
      longitude: i * 0.5,
      magnitudeValue: null,
      magnitudeUnit: null,
    }));
    const result = prepareHistoryPath(obs, 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it("is deterministic", () => {
    const obs = [
      { observedAt: null, latitude: 1, longitude: 2, magnitudeValue: null, magnitudeUnit: null },
      { observedAt: null, latitude: 3, longitude: 4, magnitudeValue: null, magnitudeUnit: null },
    ];
    const a = prepareHistoryPath(obs);
    const b = prepareHistoryPath(obs);
    expect(a).toEqual(b);
  });
});
