// ============================================================
// JMA typhoon data fetching & normalization
//
// Data source: Japan Meteorological Agency (JMA)
// Endpoints:
//   - targetTc.json: list of active typhoons
//   - TC{code}/forecast.json: full forecast data
//
// The JMA endpoint is public but not officially stable.
// This adapter layer isolates format changes.
// ============================================================

import type {
  TyphoonData,
  TyphoonCurrent,
  ForecastPoint,
  StormInfo,
  TrackHistory,
  WindRadii,
  StormArc,
} from "./types";
import { classifyTyphoon } from "./types";

// ============================================================
// Configuration
// ============================================================

const JMA_BASE = "https://www.jma.go.jp/bosai/typhoon/data";
const TARGET_TC_URL = `${JMA_BASE}/targetTc.json`;
const TIMEOUT_MS = 12_000;

// ============================================================
// Raw JMA types (what the API actually returns)
// ============================================================

type JmaTargetTc = {
  tropicalCyclone: string;
  typhoonNumber: string;
  category: string;
  issue: string;
};

type JmaIssue = {
  JST: string;
  UTC: string;
};

type JmaName = {
  jp: string;
  en: string;
};

type JmaPartLabel = {
  jp: string;
  en: string;
};

type JmaCenter = number[]; // [lat, lng, pressure?, wind?, gust?, dir?, speed?]

type JmaGaleWarning = {
  center: JmaCenter;
  radius: number; // meters
};

type JmaStormArc = [
  JmaCenter,        // arc center
  number,           // radius in meters
  [number, number]  // [start, end] degrees
];

type JmaStormWarning = {
  arc: JmaStormArc[];
};

type JmaProbabilityCircle = {
  radius: number;        // meters
  tangent_3h?: [JmaCenter, JmaCenter][];
  tangent?: [JmaCenter, JmaCenter][];
};

type JmaForecastPart = {
  part: JmaPartLabel | "title";
  issue?: JmaIssue;
  typhoonNumber?: string;
  name?: JmaName;
  advancedHours?: number;
  validtime?: JmaIssue;
  track?: {
    preTyphoon?: JmaCenter[];
    typhoon?: JmaCenter[];
  };
  center?: JmaCenter;
  galeWarningArea?: JmaGaleWarning;
  stormWarningArea?: JmaStormWarning;
  probabilityCircle?: JmaProbabilityCircle;
};

// ============================================================
// Helpers
// ============================================================

function metersToKm(meters: number): number {
  return Math.round(meters / 100) / 10; // meters -> km, 1 decimal
}

function parseJstDate(jst: string): Date {
  // JST format: "2026-07-11T00:45:00+09:00"
  return new Date(jst);
}

function safeNumber(val: unknown): number | null {
  if (typeof val !== "number" || !Number.isFinite(val)) return null;
  return val;
}

// ============================================================
// Fetch target TC list
// ============================================================

export async function fetchTargetTc(): Promise<JmaTargetTc[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(TARGET_TC_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`JMA targetTc returned HTTP ${res.status}`);
    }

    const data: unknown = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("JMA targetTc: expected array");
    }

    return data as JmaTargetTc[];
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// Fetch forecast for a specific TC
// ============================================================

async function fetchForecastJson(tcCode: string): Promise<JmaForecastPart[]> {
  const url = `${JMA_BASE}/${tcCode}/forecast.json`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`JMA forecast returned HTTP ${res.status}`);
    }

    const data: unknown = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("JMA forecast: expected array");
    }

    return data as JmaForecastPart[];
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// Parse JMA forecast data into normalized TyphoonData
// ============================================================

function parseStormInfo(titlePart: JmaForecastPart): StormInfo | null {
  if (!titlePart.issue || !titlePart.typhoonNumber || !titlePart.name) {
    return null;
  }

  return {
    typhoonNumber: titlePart.typhoonNumber,
    nameJp: titlePart.name.jp,
    nameEn: titlePart.name.en,
    issueTime: titlePart.issue.JST,
    issueTimeUtc: titlePart.issue.UTC,
  };
}

function parseWindRadii(
  galeArea: JmaGaleWarning | undefined,
  stormArea: JmaStormWarning | undefined,
): WindRadii {
  let stormArc: StormArc | null = null;

  if (stormArea?.arc && stormArea.arc.length > 0) {
    const arc = stormArea.arc[0];
    stormArc = {
      center: arc[0],
      radius: arc[1],
      direction: arc[2],
    };
  }

  return {
    galeRadius: galeArea?.radius ? metersToKm(galeArea.radius) : null,
    stormRadius: stormArc ? metersToKm(stormArc.radius) : null,
    stormArc,
  };
}

function parseAnalysis(part: JmaForecastPart): {
  current: TyphoonCurrent;
  windRadii: WindRadii;
  trackHistory: TrackHistory | null;
} | null {
  if (!part.center || !part.validtime) return null;

  const center = part.center;
  const pressure = center.length > 2 ? safeNumber(center[2]) : null;
  const windSpeed = center.length > 3 ? safeNumber(center[3]) : null;
  const gustSpeed = center.length > 4 ? safeNumber(center[4]) : null;
  const direction = center.length > 5 ? safeNumber(center[5]) : null;
  const speed = center.length > 6 ? safeNumber(center[6]) : null;

  // JMA center array can be [lat, lng] or [lat, lng, pressure, wind, gust, dir, speed]
  const lat = center[0];
  const lng = center[1];

  const windRadii = parseWindRadii(part.galeWarningArea, part.stormWarningArea);
  const category = classifyTyphoon(windSpeed ?? 0);

  const current: TyphoonCurrent = {
    lat,
    lng,
    pressure: pressure ?? 1000,
    windSpeed: windSpeed ?? 0,
    gustSpeed,
    direction,
    speed,
    category,
    windRadii,
    validTime: part.validtime.JST,
  };

  const trackHistory: TrackHistory | null = part.track
    ? {
        preTyphoon: part.track.preTyphoon ?? [],
        typhoon: part.track.typhoon ?? [],
      }
    : null;

  return { current, windRadii, trackHistory };
}

function parseForecast(part: JmaForecastPart): ForecastPoint | null {
  if (!part.center || !part.validtime || part.advancedHours == null) return null;

  const center = part.center;
  const pressure = center.length > 2 ? safeNumber(center[2]) : null;
  const windSpeed = center.length > 3 ? safeNumber(center[3]) : null;

  const probRadius = part.probabilityCircle?.radius
    ? metersToKm(part.probabilityCircle.radius)
    : null;

  const stormRadius = part.stormWarningArea?.arc?.[0]
    ? metersToKm(part.stormWarningArea.arc[0][1])
    : null;

  return {
    lat: center[0],
    lng: center[1],
    pressure: pressure ?? 1000,
    windSpeed: windSpeed ?? 0,
    gustSpeed: null, // JMA doesn't provide gust in forecast
    probRadius,
    hoursAhead: part.advancedHours,
    validTime: part.validtime.JST,
    category: classifyTyphoon(windSpeed ?? 0),
    stormRadius,
  };
}

// ============================================================
// Main fetch function
// ============================================================

export async function fetchTyphoonData(): Promise<TyphoonData> {
  // Step 1: Get active typhoon list
  const tcList = await fetchTargetTc();

  if (tcList.length === 0) {
    throw new Error("No active typhoon found in JMA data");
  }

  // Find typhoon 2609 (巴威 BAVI)
  const target = tcList.find((tc) => tc.typhoonNumber === "2609");

  if (!target) {
    throw new Error(
      `Typhoon 2609 (巴威) not found in active list. Active: ${tcList
        .map((t) => `${t.typhoonNumber} ${t.tropicalCyclone}`)
        .join(", ")}`
    );
  }

  // Step 2: Fetch full forecast
  const parts = await fetchForecastJson(target.tropicalCyclone);

  // Step 3: Parse sections
  const titlePart = parts.find((p) => p.part === "title");
  const analysisPart = parts.find(
    (p) => typeof p.part === "object" && p.part.en === "Analysis",
  );
  const forecastParts = parts.filter(
    (p) =>
      typeof p.part === "object" &&
      p.part.en !== "Analysis" &&
      p.advancedHours != null,
  );

  if (!titlePart || !analysisPart) {
    throw new Error("JMA forecast: missing title or analysis section");
  }

  const storm = parseStormInfo(titlePart);
  if (!storm) {
    throw new Error("JMA forecast: failed to parse storm info");
  }

  const analysis = parseAnalysis(analysisPart);
  if (!analysis) {
    throw new Error("JMA forecast: failed to parse analysis");
  }

  const forecast: ForecastPoint[] = [];
  for (const fp of forecastParts) {
    const parsed = parseForecast(fp);
    if (parsed) forecast.push(parsed);
  }

  return {
    storm,
    current: analysis.current,
    forecast,
    windRadii: analysis.windRadii,
    trackHistory: analysis.trackHistory,
    source: "Japan Meteorological Agency (JMA)",
    fetchedAt: new Date().toISOString(),
  };
}
