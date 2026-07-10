// ============================================================
// Planet Pulse — Tests for geographic distance utilities
// ============================================================

import { describe, it, expect } from "vitest";
import { haversineDistance } from "@/lib/geo/distance";

// ---------------------------------------------------------------------------
// haversineDistance
// ---------------------------------------------------------------------------

describe("haversineDistance", () => {
  // --- 1. Same coordinates ---

  it("returns 0 for identical coordinates", () => {
    expect(haversineDistance(37.7749, -122.4194, 37.7749, -122.4194)).toBe(0);
  });

  it("returns 0 for (0, 0) to (0, 0)", () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0);
  });

  // --- 2. London to New York ---

  it("computes London to New York distance (~5570–5590 km)", () => {
    const londonLat = 51.5074;
    const londonLng = -0.1278;
    const nyLat = 40.7128;
    const nyLng = -74.006;

    const distance = haversineDistance(londonLat, londonLng, nyLat, nyLng);

    // Approximately 5570 km (varies slightly by formula / Earth radius used)
    expect(distance).toBeGreaterThan(5570);
    expect(distance).toBeLessThan(5590);
  });

  // --- 3. North Pole to South Pole ---

  it("computes North Pole to South Pole distance (~20000–20040 km)", () => {
    const distance = haversineDistance(90, 0, -90, 0);

    // Half the Earth's circumference ≈ 20015 km
    expect(distance).toBeGreaterThan(20000);
    expect(distance).toBeLessThan(20040);
  });

  // --- 4. Symmetry ---

  it("is symmetric: d(a, b) === d(b, a)", () => {
    const a = { lat: 34.0522, lng: -118.2437 }; // Los Angeles
    const b = { lat: 40.7128, lng: -74.006 }; // New York

    const forward = haversineDistance(a.lat, a.lng, b.lat, b.lng);
    const backward = haversineDistance(b.lat, b.lng, a.lat, a.lng);

    expect(forward).toBe(backward);
  });

  it("is symmetric for arbitrary coordinates", () => {
    const pairs: [number, number, number, number][] = [
      [-33.8688, 151.2093, 35.6762, 139.6503], // Sydney → Tokyo
      [51.5074, -0.1278, 48.8566, 2.3522], // London → Paris
      [-23.5505, -46.6333, -34.6037, -58.3816], // São Paulo → Buenos Aires
    ];

    for (const [lat1, lng1, lat2, lng2] of pairs) {
      const d1 = haversineDistance(lat1, lng1, lat2, lng2);
      const d2 = haversineDistance(lat2, lng2, lat1, lng1);
      expect(d1).toBeCloseTo(d2, 8);
    }
  });

  // --- 5. Invalid latitude throws ---

  it("throws RangeError for invalid lat1", () => {
    expect(() => haversineDistance(91, 0, 0, 0)).toThrow(RangeError);
    expect(() => haversineDistance(-91, 0, 0, 0)).toThrow(RangeError);
  });

  it("throws RangeError for invalid lat2", () => {
    expect(() => haversineDistance(0, 0, 91, 0)).toThrow(RangeError);
    expect(() => haversineDistance(0, 0, -91, 0)).toThrow(RangeError);
  });

  // --- 6. Invalid longitude throws ---

  it("throws RangeError for invalid lng1", () => {
    expect(() => haversineDistance(0, 181, 0, 0)).toThrow(RangeError);
    expect(() => haversineDistance(0, -181, 0, 0)).toThrow(RangeError);
  });

  it("throws RangeError for invalid lng2", () => {
    expect(() => haversineDistance(0, 0, 0, 181)).toThrow(RangeError);
    expect(() => haversineDistance(0, 0, 0, -181)).toThrow(RangeError);
  });

  // --- 7. Additional edge cases ---

  it("returns 0 (within floating-point tolerance) when both points are at the same pole", () => {
    expect(haversineDistance(90, 50, 90, -50)).toBeCloseTo(0, 10);
    expect(haversineDistance(-90, 100, -90, -100)).toBeCloseTo(0, 10);
  });

  it("computes short distances accurately", () => {
    // Two points ~111 km apart (1 degree latitude ≈ 111 km)
    const distance = haversineDistance(0, 0, 1, 0);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });

  it("accepts boundary coordinate values", () => {
    // Should not throw for valid boundary values
    expect(() => haversineDistance(90, 180, -90, -180)).not.toThrow();
  });
});
