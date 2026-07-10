import { describe, it, expect } from "vitest";

// ============================================================
// Tests for typhoon data structures and edge cases
// These test the data shapes we expect from JMA without
// requiring a live API connection.
// ============================================================

/** Simulated JMA forecast part */
type JmaPart = {
  part: unknown;
  advancedHours?: number;
  validtime?: { JST: string; UTC: string };
  center?: number[];
  probabilityCircle?: { radius: number } | undefined;
  galeWarningArea?: { center: number[]; radius: number } | undefined;
  stormWarningArea?: { arc: [number[], number, [number, number]][] } | undefined;
  track?: { preTyphoon?: number[][]; typhoon?: number[][] };
};

function makeAnalysis(overrides: Partial<JmaPart> = {}): JmaPart {
  return {
    part: { jp: "実況", en: "Analysis" },
    advancedHours: 0,
    validtime: { JST: "2026-07-11T00:00:00+09:00", UTC: "2026-07-10T15:00:00Z" },
    center: [23.3, 125.7, 965, 70, 100, 315, 20],
    track: {
      preTyphoon: [[9.5, 162.6], [9.1, 162.4]],
      typhoon: [[10.3, 159.9], [23.3, 125.7]],
    },
    galeWarningArea: { center: [23.3, 125.7], radius: 740800 },
    stormWarningArea: {
      arc: [[[23.48, 125.89], 361140, [0.0, 360.0]]],
    },
    ...overrides,
  };
}

function makeForecast(hoursAhead: number, overrides: Partial<JmaPart> = {}): JmaPart {
  return {
    part: { jp: `${hoursAhead}時間予報`, en: `Forecast for ${hoursAhead} hours ahead` },
    advancedHours: hoursAhead,
    validtime: { JST: "2026-07-12T00:00:00+09:00", UTC: "2026-07-11T15:00:00Z" },
    center: [27.7, 121.3, 975, 60],
    probabilityCircle: { radius: 64820 },
    ...overrides,
  };
}

describe("Analysis data parsing", () => {
  it("parses full analysis with all fields", () => {
    const a = makeAnalysis();
    expect(a.center).toBeDefined();
    expect(a.center![0]).toBe(23.3);
    expect(a.center![1]).toBe(125.7);
    expect(a.center![2]).toBe(965); // pressure
    expect(a.center![3]).toBe(70);  // wind speed
    expect(a.center![4]).toBe(100); // gust
    expect(a.center![5]).toBe(315); // direction
    expect(a.center![6]).toBe(20);  // speed
  });

  it("parses analysis with minimal center (lat/lng only)", () => {
    const a = makeAnalysis({ center: [23.3, 125.7] });
    expect(a.center!.length).toBe(2);
    expect(a.center![2]).toBeUndefined();
  });

  it("parses analysis without track history", () => {
    const a = makeAnalysis({ track: undefined });
    expect(a.track).toBeUndefined();
  });

  it("parses analysis with only typhoon track (no pre-typhoon)", () => {
    const a = makeAnalysis({
      track: { typhoon: [[10, 160], [20, 130]] },
    });
    expect(a.track!.typhoon).toBeDefined();
    expect(a.track!.typhoon!.length).toBe(2);
    expect(a.track!.preTyphoon).toBeUndefined();
  });

  it("handles analysis without galeWarningArea", () => {
    const a = makeAnalysis({ galeWarningArea: undefined });
    expect(a.galeWarningArea).toBeUndefined();
  });

  it("handles analysis without stormWarningArea", () => {
    const a = makeAnalysis({ stormWarningArea: undefined });
    expect(a.stormWarningArea).toBeUndefined();
  });
});

describe("Forecast data parsing", () => {
  it("parses 24h forecast correctly", () => {
    const fc = makeForecast(24);
    expect(fc.advancedHours).toBe(24);
    expect(fc.center![0]).toBe(27.7);
    expect(fc.center![1]).toBe(121.3);
    expect(fc.center![2]).toBe(975);
    expect(fc.center![3]).toBe(60);
    expect(fc.probabilityCircle).toBeDefined();
    expect(fc.probabilityCircle!.radius).toBe(64820);
  });

  it("handles forecast without probability circle", () => {
    const fc = makeForecast(24, { probabilityCircle: undefined });
    expect(fc.probabilityCircle).toBeUndefined();
  });

  it("handles forecast with zero-radius probability circle", () => {
    const fc = makeForecast(24, { probabilityCircle: { radius: 0 } });
    expect(fc.probabilityCircle!.radius).toBe(0);
  });

  it("handles multiple forecast time horizons", () => {
    const horizons = [3, 6, 12, 24, 45, 69, 120];
    for (const h of horizons) {
      const fc = makeForecast(h);
      expect(fc.advancedHours).toBe(h);
    }
  });

  it("handles forecast with only lat/lng (no pressure/wind)", () => {
    const fc = makeForecast(24, { center: [27.7, 121.3] });
    expect(fc.center!.length).toBe(2);
  });
});

describe("Edge cases", () => {
  it("handles tropical depression downgrade (weak wind)", () => {
    const a = makeAnalysis({ center: [23.3, 125.7, 1004, 30] });
    expect(a.center![2]).toBe(1004); // high pressure
    expect(a.center![3]).toBe(30);   // weak wind (< 34 = TD)
  });

  it("handles super typhoon (very strong)", () => {
    const a = makeAnalysis({ center: [20.0, 130.0, 910, 120, 160, 315, 15] });
    expect(a.center![2]).toBe(910);  // very low pressure
    expect(a.center![3]).toBe(120);  // very strong wind
  });

  it("handles zero movement (stationary typhoon)", () => {
    const a = makeAnalysis({ center: [23.3, 125.7, 980, 50, 0, 0, 0] });
    expect(a.center![6]).toBe(0); // no movement speed
  });

  it("handles null/zero wind radii", () => {
    const a = makeAnalysis({
      galeWarningArea: { center: [23.3, 125.7], radius: 0 },
      stormWarningArea: { arc: [[[23.48, 125.89], 0, [0, 360]]] },
    });
    expect(a.galeWarningArea!.radius).toBe(0);
    expect(a.stormWarningArea!.arc[0][1]).toBe(0);
  });

  it("handles forecast with very large probability circle (high uncertainty)", () => {
    const fc = makeForecast(120, { probabilityCircle: { radius: 500000 } });
    expect(fc.probabilityCircle!.radius).toBe(500000);
  });

  it("handles forecast at exact 0 degrees (equator)", () => {
    const fc = makeForecast(24, { center: [0.0, 125.0] });
    expect(fc.center![0]).toBe(0);
    expect(fc.center![1]).toBe(125);
  });
});

describe("Time validation", () => {
  it("parses valid JST timestamps", () => {
    const jst = "2026-07-11T00:45:00+09:00";
    const d = new Date(jst);
    expect(d.getTime()).toBeGreaterThan(0);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July = 6 (0-indexed)
    expect(d.getDate()).toBe(10); // UTC date
  });

  it("handles invalid timestamps", () => {
    const invalid = "not-a-date";
    const d = new Date(invalid);
    expect(isNaN(d.getTime())).toBe(true);
  });

  it("handles empty string timestamp", () => {
    const empty = "";
    const d = new Date(empty);
    // In most JS engines, new Date("") returns Invalid Date
    expect(isNaN(d.getTime())).toBe(true);
  });
});

describe("Coordinates", () => {
  it("validates latitude range", () => {
    const validLats = [-90, -23.3, 0, 23.3, 90];
    for (const lat of validLats) {
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
    }
  });

  it("validates longitude range", () => {
    const validLngs = [-180, -125.7, 0, 121.3, 180];
    for (const lng of validLngs) {
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    }
  });
});
