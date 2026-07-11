import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ECMWF ensemble forecast model via Open-Meteo (free, no API key)
const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

export type PredictionPoint = {
  lat: number;
  lng: number;
  time: string;
  jmaWindMs: number;
  jmaPressure: number;
  ecmwfWindMs: number | null;
  ecmwfPressure: number | null;
};

/**
 * GET /api/typhoon/prediction?points=lat1,lng1,time1|lat2,lng2,time2
 *
 * Fetches ECMWF ensemble forecasts from Open-Meteo for each JMA forecast point.
 * Returns a comparison: JMA official forecast vs ECMWF model output.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pointsRaw = searchParams.get("points");

  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=1800",
    "Access-Control-Allow-Origin": "*",
  };

  if (!pointsRaw) {
    return NextResponse.json({ error: "points parameter required" }, { status: 400, headers });
  }

  try {
    const points = pointsRaw.split("|").map((p) => {
      const [lat, lng, time, windMs, pressure] = p.split(",");
      return {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        time,
        jmaWindMs: parseFloat(windMs),
        jmaPressure: parseFloat(pressure),
      };
    });

    // Fetch ECMWF for each point (batch of 3 to stay under rate limits)
    const results: PredictionPoint[] = [];
    for (const pt of points) {
      try {
        const url = `${OPEN_METEO}?latitude=${pt.lat.toFixed(2)}&longitude=${pt.lng.toFixed(2)}&hourly=wind_speed_10m,pressure_msl&wind_speed_unit=ms&forecast_days=2&models=ecmwf_ifs`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

        if (!res.ok) {
          results.push({ ...pt, ecmwfWindMs: null, ecmwfPressure: null });
          continue;
        }

        const data = await res.json();
        const times: string[] = data.hourly?.time ?? [];
        const winds: number[] = data.hourly?.wind_speed_10m ?? [];
        const pressures: number[] = data.hourly?.pressure_msl ?? [];

        // Find closest time to JMA forecast time
        const targetTime = new Date(pt.time).getTime();
        let bestIdx = 0;
        let bestDiff = Infinity;
        for (let i = 0; i < times.length; i++) {
          const diff = Math.abs(new Date(times[i]).getTime() - targetTime);
          if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
        }

        results.push({
          ...pt,
          ecmwfWindMs: winds[bestIdx] ?? null,
          ecmwfPressure: pressures[bestIdx] != null ? Math.round(pressures[bestIdx]) : null,
        });
      } catch {
        results.push({ ...pt, ecmwfWindMs: null, ecmwfPressure: null });
      }
    }

    return NextResponse.json({ predictions: results, model: "ECMWF IFS (Open-Meteo)" }, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 502, headers },
    );
  }
}
