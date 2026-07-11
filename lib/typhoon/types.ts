// ============================================================
// Typhoon monitoring — Core type definitions
// ============================================================

/** Typhoon intensity category (JMA classification) */
export type TyphoonCategory = "TD" | "TS" | "STS" | "TY";

/** A single track point (historical or forecast) */
export type TrackPoint = {
  /** Latitude in decimal degrees */
  lat: number;
  /** Longitude in decimal degrees */
  lng: number;
  /** JST timestamp */
  time: string;
  /** Central pressure in hPa */
  pressure: number | null;
  /** Maximum sustained wind speed in knots */
  windSpeed: number | null;
  /** Maximum gust speed in knots */
  gustSpeed: number | null;
  /** Movement direction (degrees, 0=north, clockwise) */
  direction: number | null;
  /** Movement speed in km/h */
  speed: number | null;
  /** Probability circle radius in km (forecast only) */
  probRadius: number | null;
  /** Whether this is a forecast point */
  isForecast: boolean;
  /** Advanced hours from analysis time */
  hoursAhead: number;
};

/** Wind radius information */
export type WindRadii = {
  /** Gale warning area radius in km (>= 15 m/s) */
  galeRadius: number | null;
  /** Storm warning area radius in km (>= 25 m/s) */
  stormRadius: number | null;
  /** Storm warning arc data */
  stormArc: StormArc | null;
};

export type StormArc = {
  center: number[];
  radius: number;  // meters
  direction: [number, number]; // [start, end] degrees
};

/** Current typhoon status */
export type TyphoonCurrent = {
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** Central pressure (hPa) */
  pressure: number;
  /** Maximum sustained wind speed (knots) */
  windSpeed: number;
  /** Maximum gust speed (knots) */
  gustSpeed: number | null;
  /** Movement direction (degrees) */
  direction: number | null;
  /** Movement speed (km/h) */
  speed: number | null;
  /** Intensity category */
  category: TyphoonCategory;
  /** Wind radii */
  windRadii: WindRadii;
  /** Analysis valid time (JST) */
  validTime: string;
};

/** Forecast point */
export type ForecastPoint = {
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** Central pressure (hPa) */
  pressure: number;
  /** Maximum sustained wind speed (knots) */
  windSpeed: number;
  /** Maximum gust speed (knots) */
  gustSpeed: number | null;
  /** Probability circle radius (km) */
  probRadius: number | null;
  /** Hours ahead from analysis */
  hoursAhead: number;
  /** Forecast valid time (JST) */
  validTime: string;
  /** Intensity category */
  category: TyphoonCategory;
  /** Storm warning area (if present) */
  stormRadius: number | null;
};

/** Typhoon metadata */
export type StormInfo = {
  /** JMA typhoon number (e.g. "2609") */
  typhoonNumber: string;
  /** Name in Japanese */
  nameJp: string;
  /** Name in English */
  nameEn: string;
  /** Issue time (JST) */
  issueTime: string;
  /** Issue time (UTC) */
  issueTimeUtc: string;
};

/** Historical track points (analysis-only positions) */
export type TrackHistory = {
  /** Pre-typhoon track (tropical depression phase) */
  preTyphoon: number[][];
  /** Typhoon track (post-naming) */
  typhoon: number[][];
};

/** Unified typhoon data response from /api/typhoon */
export type TyphoonData = {
  /** Storm identification */
  storm: StormInfo;
  /** Current analysis */
  current: TyphoonCurrent;
  /** Forecast points (0-120h) */
  forecast: ForecastPoint[];
  /** Wind radii information */
  windRadii: WindRadii;
  /** Historical track coordinates */
  trackHistory: TrackHistory | null;
  /** Data source label */
  source: string;
  /** Server fetch time (ISO) */
  fetchedAt: string;
  /** Error message if data is stale */
  error?: string;
};

/** API response envelope */
export type TyphoonApiResponse = {
  data: TyphoonData | null;
  error: string | null;
  stale: boolean;
  lastSuccessAt: string | null;
};

/** Intensity category display info */
export const CATEGORY_INFO: Record<TyphoonCategory, { label: string; labelJp: string; color: string }> = {
  TD: { label: "Tropical Depression", labelJp: "熱帯低気圧", color: "#6B9BD2" },
  TS: { label: "Tropical Storm", labelJp: "台風", color: "#F5D547" },
  STS: { label: "Severe Tropical Storm", labelJp: "強い台風", color: "#F08C3E" },
  TY: { label: "Typhoon", labelJp: "非常に強い台風", color: "#E53E3E" },
};

/** Category classification based on wind speed (knots) */
export function classifyTyphoon(windSpeedKt: number): TyphoonCategory {
  if (windSpeedKt < 34) return "TD";
  if (windSpeedKt < 48) return "TS";
  if (windSpeedKt < 64) return "STS";
  return "TY";
}

/** Convert knots to km/h */
export function knotsToKmh(knots: number): number {
  return Math.round(knots * 1.852);
}

/** Convert knots to m/s */
export function knotsToMs(knots: number): number {
  return Math.round(knots * 0.5144);
}

// ============================================================
// Wind force level (Chinese typhoon scale 0–17)
// Based on 10-min average wind speed in m/s
// ============================================================

export type WindLevel = {
  level: number;
  label: string;
  labelEn: string;
};

export function getWindLevel(windMs: number): WindLevel {
  if (windMs < 0.3) return { level: 0, label: "无风", labelEn: "Calm" };
  if (windMs < 1.6) return { level: 1, label: "软风", labelEn: "Light Air" };
  if (windMs < 3.4) return { level: 2, label: "轻风", labelEn: "Light Breeze" };
  if (windMs < 5.5) return { level: 3, label: "微风", labelEn: "Gentle Breeze" };
  if (windMs < 8.0) return { level: 4, label: "和风", labelEn: "Moderate Breeze" };
  if (windMs < 10.8) return { level: 5, label: "劲风", labelEn: "Fresh Breeze" };
  if (windMs < 13.9) return { level: 6, label: "强风", labelEn: "Strong Breeze" };
  if (windMs < 17.2) return { level: 7, label: "疾风", labelEn: "Near Gale" };
  if (windMs < 20.8) return { level: 8, label: "大风", labelEn: "Gale" };
  if (windMs < 24.5) return { level: 9, label: "烈风", labelEn: "Strong Gale" };
  if (windMs < 28.5) return { level: 10, label: "狂风", labelEn: "Storm" };
  if (windMs < 32.7) return { level: 11, label: "暴风", labelEn: "Violent Storm" };
  if (windMs < 37.0) return { level: 12, label: "台风", labelEn: "Typhoon" };
  if (windMs < 41.5) return { level: 13, label: "台风", labelEn: "Typhoon" };
  if (windMs < 46.2) return { level: 14, label: "强台风", labelEn: "Severe Typhoon" };
  if (windMs < 51.0) return { level: 15, label: "强台风", labelEn: "Severe Typhoon" };
  if (windMs < 56.1) return { level: 16, label: "超强台风", labelEn: "Super Typhoon" };
  return { level: 17, label: "超强台风", labelEn: "Super Typhoon" };
}

// ============================================================
// Compass direction
// ============================================================

const COMPASS_ZH = ["北", "北北东", "东北", "东东北", "东", "东东南", "东南", "南南东", "南", "南南西", "西南", "西西南", "西", "西西北", "西北", "北北西"];
const COMPASS_EN = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export function degreesToCompass(deg: number): { zh: string; en: string } {
  const i = Math.round(deg / 22.5) % 16;
  return { zh: COMPASS_ZH[i], en: COMPASS_EN[i] };
}
