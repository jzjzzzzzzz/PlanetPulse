import { describe, it, expect } from "vitest";
import {
  classifyTyphoon,
  knotsToKmh,
  knotsToMs,
  CATEGORY_INFO,
} from "@/lib/typhoon/types";

describe("classifyTyphoon", () => {
  it("returns TD for wind < 34 knots", () => {
    expect(classifyTyphoon(20)).toBe("TD");
    expect(classifyTyphoon(33)).toBe("TD");
  });

  it("returns TS for 34-47 knots", () => {
    expect(classifyTyphoon(34)).toBe("TS");
    expect(classifyTyphoon(47)).toBe("TS");
  });

  it("returns STS for 48-63 knots", () => {
    expect(classifyTyphoon(48)).toBe("STS");
    expect(classifyTyphoon(63)).toBe("STS");
  });

  it("returns TY for >= 64 knots", () => {
    expect(classifyTyphoon(64)).toBe("TY");
    expect(classifyTyphoon(120)).toBe("TY");
  });

  it("returns TD for 0 or negative", () => {
    expect(classifyTyphoon(0)).toBe("TD");
    expect(classifyTyphoon(-1)).toBe("TD");
  });
});

describe("knotsToKmh", () => {
  it("converts correctly", () => {
    expect(knotsToKmh(34)).toBe(63); // 34 * 1.852 = 62.968
    expect(knotsToKmh(64)).toBe(119);
    expect(knotsToKmh(100)).toBe(185);
  });

  it("handles zero", () => {
    expect(knotsToKmh(0)).toBe(0);
  });
});

describe("knotsToMs", () => {
  it("converts correctly", () => {
    expect(knotsToMs(34)).toBe(17); // 34 * 0.5144 = 17.4896
    expect(knotsToMs(64)).toBe(33);
  });
});

describe("CATEGORY_INFO", () => {
  it("has entries for all categories", () => {
    expect(CATEGORY_INFO.TD).toBeDefined();
    expect(CATEGORY_INFO.TS).toBeDefined();
    expect(CATEGORY_INFO.STS).toBeDefined();
    expect(CATEGORY_INFO.TY).toBeDefined();
  });

  it("has valid labels for each category", () => {
    for (const cat of ["TD", "TS", "STS", "TY"] as const) {
      expect(CATEGORY_INFO[cat].label).toBeTruthy();
      expect(CATEGORY_INFO[cat].labelJp).toBeTruthy();
      expect(CATEGORY_INFO[cat].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
