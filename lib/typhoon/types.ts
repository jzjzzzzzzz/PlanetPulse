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
