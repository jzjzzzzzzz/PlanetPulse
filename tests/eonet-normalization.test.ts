// ============================================================
// Planet Pulse — Tests for EONET normalization helpers
// ============================================================

import { describe, it, expect } from "vitest";
import {
  normalizeCategory,
  categoryFromTitle,
  getMostRecentGeometry,
  polygonCenter,
  validateCoordinates,
  sanitizeUrl,
} from "@/lib/nasa/normalize";

// ---------------------------------------------------------------------------
// normalizeCategory
// ---------------------------------------------------------------------------

describe("normalizeCategory", () => {
  it('maps "Wildfires" to "wildfire"', () => {
    expect(normalizeCategory("Wildfires")).toBe("wildfire");
  });

  it('maps "Severe Storms" to "severe-storm"', () => {
    expect(normalizeCategory("Severe Storms")).toBe("severe-storm");
  });

  it('maps "Volcanoes" to "volcano"', () => {
    expect(normalizeCategory("Volcanoes")).toBe("volcano");
  });

  it('maps "Floods" to "flood"', () => {
    expect(normalizeCategory("Floods")).toBe("flood");
  });

  it('maps "Drought" to "drought"', () => {
    expect(normalizeCategory("Drought")).toBe("drought");
  });

  it('maps "Dust and Haze" to "dust-haze"', () => {
    expect(normalizeCategory("Dust and Haze")).toBe("dust-haze");
  });

  it('maps "Landslides" to "landslide"', () => {
    expect(normalizeCategory("Landslides")).toBe("landslide");
  });

  it('maps "Sea and Lake Ice" to "sea-lake-ice"', () => {
    expect(normalizeCategory("Sea and Lake Ice")).toBe("sea-lake-ice");
  });

  it('maps "Unknown Category" to "other"', () => {
    expect(normalizeCategory("Unknown Category")).toBe("other");
  });

  it("is case insensitive: WILDFIRES → wildfire", () => {
    expect(normalizeCategory("WILDFIRES")).toBe("wildfire");
  });

  it("returns other for empty string", () => {
    expect(normalizeCategory("")).toBe("other");
  });
});

// ---------------------------------------------------------------------------
// categoryFromTitle
// ---------------------------------------------------------------------------

describe("categoryFromTitle", () => {
  it("detects wildfire from title", () => {
    expect(categoryFromTitle("Wildfire in California")).toBe("wildfire");
  });

  it("detects severe-storm from title", () => {
    expect(categoryFromTitle("Hurricane approaching Florida")).toBe("severe-storm");
  });

  it("detects volcano from title", () => {
    expect(categoryFromTitle("Volcanic eruption in Iceland")).toBe("volcano");
  });

  it("detects flood from title", () => {
    expect(categoryFromTitle("Flash flood warning")).toBe("flood");
  });

  it("detects drought from title", () => {
    expect(categoryFromTitle("Drought conditions persist")).toBe("drought");
  });

  it("detects dust-haze from title", () => {
    expect(categoryFromTitle("Sandstorm in the Sahara")).toBe("dust-haze");
  });

  it("detects landslide from title", () => {
    expect(categoryFromTitle("Mudslide blocks highway")).toBe("landslide");
  });

  it("detects sea-lake-ice from title", () => {
    expect(categoryFromTitle("Iceberg breaks off Antarctic shelf")).toBe("sea-lake-ice");
  });

  it("returns null for unrecognized title", () => {
    expect(categoryFromTitle("Some random event")).toBeNull();
  });

  it("returns null for empty title", () => {
    expect(categoryFromTitle("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getMostRecentGeometry
// ---------------------------------------------------------------------------

describe("getMostRecentGeometry", () => {
  it("returns the most recent geometry based on date", () => {
    const geometries = [
      { type: "Point", coordinates: [10, 20], date: "2024-01-01T00:00:00Z" },
      { type: "Point", coordinates: [30, 40], date: "2024-06-15T00:00:00Z" },
      { type: "Point", coordinates: [50, 60], date: "2024-03-10T00:00:00Z" },
    ];

    const result = getMostRecentGeometry(geometries);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("Point");
    expect(result!.coordinates).toEqual([30, 40]);
    expect(result!.date).toBe("2024-06-15T00:00:00Z");
  });

  it("returns null for empty array", () => {
    expect(getMostRecentGeometry([])).toBeNull();
  });

  it("returns null for null input", () => {
    expect(getMostRecentGeometry(null as unknown as unknown[])).toBeNull();
  });

  it("skips geometries with invalid or missing dates", () => {
    const geometries = [
      { type: "Point", coordinates: [10, 20], date: "not-a-date" },
      { type: "Point", coordinates: [30, 40] },
      { type: "Point", coordinates: [50, 60], date: "2024-06-15T00:00:00Z" },
    ];

    const result = getMostRecentGeometry(geometries);
    expect(result).not.toBeNull();
    expect(result!.coordinates).toEqual([50, 60]);
    expect(result!.date).toBe("2024-06-15T00:00:00Z");
  });

  it("preserves magnitudeValue and magnitudeUnit", () => {
    const geometries = [
      {
        type: "Point",
        coordinates: [10, 20],
        date: "2024-06-15T00:00:00Z",
        magnitudeValue: 7.5,
        magnitudeUnit: "Mw",
      },
    ];

    const result = getMostRecentGeometry(geometries);
    expect(result).not.toBeNull();
    expect(result!.magnitudeValue).toBe(7.5);
    expect(result!.magnitudeUnit).toBe("Mw");
  });

  it("handles Polygon type geometries", () => {
    const geometries = [
      {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ],
        date: "2024-06-15T00:00:00Z",
      },
    ];

    const result = getMostRecentGeometry(geometries);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("Polygon");
  });

  it("returns null when no entries have valid dates", () => {
    const geometries = [
      { type: "Point", coordinates: [10, 20] },
      { type: "Point", coordinates: [30, 40] },
    ];

    expect(getMostRecentGeometry(geometries)).toBeNull();
  });

  it("defaults type to 'Unknown' when missing", () => {
    const geometries = [
      {
        coordinates: [10, 20],
        date: "2024-06-15T00:00:00Z",
      },
    ];

    const result = getMostRecentGeometry(geometries);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("Unknown");
  });

  it("sets magnitudeValue to null for non-numeric values", () => {
    const geometries = [
      {
        type: "Point",
        coordinates: [10, 20],
        date: "2024-06-15T00:00:00Z",
        magnitudeValue: "not-a-number",
        magnitudeUnit: "Mw",
      },
    ];

    const result = getMostRecentGeometry(geometries);
    expect(result).not.toBeNull();
    expect(result!.magnitudeValue).toBeNull();
    expect(result!.magnitudeUnit).toBe("Mw");
  });
});

// ---------------------------------------------------------------------------
// validateCoordinates
// ---------------------------------------------------------------------------

describe("validateCoordinates", () => {
  it("returns true for valid coordinates", () => {
    expect(validateCoordinates(37.7749, -122.4194)).toBe(true);
  });

  it("returns false when lat > 90", () => {
    expect(validateCoordinates(91, 0)).toBe(false);
  });

  it("returns false when lat < -90", () => {
    expect(validateCoordinates(-91, 0)).toBe(false);
  });

  it("returns false when lng > 180", () => {
    expect(validateCoordinates(0, 181)).toBe(false);
  });

  it("returns false when lng < -180", () => {
    expect(validateCoordinates(0, -181)).toBe(false);
  });

  it("returns false for NaN values", () => {
    expect(validateCoordinates(NaN, 0)).toBe(false);
    expect(validateCoordinates(0, NaN)).toBe(false);
  });

  it("returns false for Infinity values", () => {
    expect(validateCoordinates(Infinity, 0)).toBe(false);
    expect(validateCoordinates(0, -Infinity)).toBe(false);
  });

  it("accepts boundary values", () => {
    expect(validateCoordinates(90, 180)).toBe(true);
    expect(validateCoordinates(-90, -180)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// polygonCenter
// ---------------------------------------------------------------------------

describe("polygonCenter", () => {
  it("computes approximate center for a simple square polygon", () => {
    const square: number[][][] = [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ];

    const center = polygonCenter(square);
    // The centroid of a square from (0,0) to (10,10) should be near (5, 5)
    // Note: coordinates are [lng, lat] in GeoJSON convention
    expect(center.lng).toBeCloseTo(5, 0);
    expect(center.lat).toBeCloseTo(5, 0);
  });

  it("computes centroid for a triangle polygon", () => {
    const triangle: number[][][] = [
      [
        [0, 0],
        [6, 0],
        [3, 6],
        [0, 0],
      ],
    ];

    const center = polygonCenter(triangle);
    // Centroid of triangle with vertices (0,0), (6,0), (3,6) is (3, 2)
    expect(center.lng).toBeCloseTo(3, 0);
    expect(center.lat).toBeCloseTo(2, 0);
  });

  it("returns { lat: 0, lng: 0 } for empty input", () => {
    expect(polygonCenter([])).toEqual({ lat: 0, lng: 0 });
  });

  it("returns { lat: 0, lng: 0 } for ring with fewer than 3 points", () => {
    const invalidRing: number[][][] = [
      [
        [0, 0],
        [10, 10],
      ],
    ];

    expect(polygonCenter(invalidRing)).toEqual({ lat: 0, lng: 0 });
  });
});

// ---------------------------------------------------------------------------
// sanitizeUrl
// ---------------------------------------------------------------------------

describe("sanitizeUrl", () => {
  it("returns valid https URL unchanged", () => {
    expect(sanitizeUrl("https://eonet.gsfc.nasa.gov/event/123")).toBe(
      "https://eonet.gsfc.nasa.gov/event/123",
    );
  });

  it("returns valid http URL (URL constructor normalizes, adding trailing slash)", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("returns null for null input", () => {
    expect(sanitizeUrl(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(sanitizeUrl(undefined)).toBeNull();
  });

  it('returns null for "javascript:alert(1)"', () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(sanitizeUrl("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(sanitizeUrl("   ")).toBeNull();
  });

  it("returns null for invalid URL strings", () => {
    expect(sanitizeUrl("not-a-valid-url")).toBeNull();
  });
});
