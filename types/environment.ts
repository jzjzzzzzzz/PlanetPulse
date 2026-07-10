// ============================================================
// Planet Pulse — Core environmental type definitions
// ============================================================

/** Normalized environmental event category */
export type EventCategory =
  | "wildfire"
  | "severe-storm"
  | "volcano"
  | "flood"
  | "drought"
  | "dust-haze"
  | "landslide"
  | "sea-lake-ice"
  | "other";

/** Category display names used in the UI */
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  wildfire: "Wildfire",
  "severe-storm": "Severe Storm",
  volcano: "Volcano",
  flood: "Flood",
  drought: "Drought",
  "dust-haze": "Dust & Haze",
  landslide: "Landslide",
  "sea-lake-ice": "Sea & Lake Ice",
  other: "Other",
};

/** Category accent colors (CSS variable references) */
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  wildfire: "var(--color-wildfire)",
  "severe-storm": "var(--color-storm)",
  volcano: "var(--color-volcano)",
  flood: "var(--color-flood)",
  drought: "var(--color-drought)",
  "dust-haze": "var(--color-dust)",
  landslide: "var(--color-landslide)",
  "sea-lake-ice": "var(--color-ice)",
  other: "var(--color-other)",
};

/** Hex values for the globe renderer (Three.js materials) */
export const CATEGORY_COLORS_HEX: Record<EventCategory, string> = {
  wildfire: "#FF6B35",
  "severe-storm": "#9B7BFF",
  volcano: "#FF435D",
  flood: "#3BD5FF",
  drought: "#D4A843",
  "dust-haze": "#B09E80",
  landslide: "#C7926B",
  "sea-lake-ice": "#8ED6E5",
  other: "#8D9AAF",
};

export type GeometryType = "Point" | "Polygon" | "Other";

/** Data source discriminator */
export type DataSource = "live" | "stale-cache" | "fallback";

/** Data freshness classification */
export type DataFreshness = "live" | "recent" | "aging" | "stale" | "unknown";

/** Individual observation from EONET geometry history */
export type EventObservation = {
  observedAt: string | null;
  latitude: number;
  longitude: number;
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
};

/** Normalized environmental event from NASA EONET or fallback */
export type EnvironmentalEvent = {
  id: string;
  title: string;
  category: EventCategory;
  latitude: number;
  longitude: number;
  startedAt: string | null;
  updatedAt: string | null;
  sourceName: string;
  sourceUrl: string | null;
  geometryType: GeometryType;
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
  hotspotScore: number;
  scoreExplanation: string[];
  /** Chronologically sorted, deduplicated observation history (max 30) */
  observations: EventObservation[];
};

/** Response metadata describing the data source and freshness */
export type EventsResponseMetadata = {
  source: DataSource;
  provider: "NASA EONET";
  format: "json" | "geojson" | "fallback";
  fetchedAt: string;
  upstreamUpdatedAt: string | null;
  eventCount: number;
  attemptCount: number;
  degradedReason: string | null;
};

/** User location state */
export type UserLocation = {
  city: string | null;
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  source: "vercel" | "browser-tz" | "geolocation" | "unavailable";
};

/** Normalized FIRMS fire detection */
export type FireDetection = {
  id: string;
  latitude: number;
  longitude: number;
  brightness: number;
  confidence: number;
  acqDate: string;
  acqTime: string;
  satellite: string;
  scanPixels: number;
  isConfirmed: boolean;
};

/** API error shape */
export type ApiError = {
  error: string;
  message: string;
  source: string;
  fallback?: boolean;
};

/** Data freshness indicator (legacy — prefer DataFreshness) */
export type DataStatus = "live" | "cached" | "stale" | "offline";
