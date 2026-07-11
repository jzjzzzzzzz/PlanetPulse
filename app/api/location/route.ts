import { NextRequest, NextResponse } from "next/server";
import { getLocationFromHeaders } from "@/lib/location/location";

export const dynamic = "force-dynamic";

/**
 * GET /api/location
 *
 * Returns approximate city-level location from Vercel IP geolocation headers.
 * No IP address is stored or logged. Location is not persisted.
 */
export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const location = getLocationFromHeaders(request.headers);

    return NextResponse.json(location, { headers });
  } catch {
    console.error("[api/location] Error resolving location");

    return NextResponse.json(
      {
        city: null,
        country: null,
        region: null,
        latitude: null,
        longitude: null,
        timezone: null,
        source: "unavailable",
      },
      { headers }
    );
  }
}
