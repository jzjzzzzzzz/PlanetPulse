import { NextResponse } from "next/server";
import { fetchEonetEvents } from "@/lib/nasa/eonet";

export const dynamic = "force-dynamic";

/**
 * GET /api/events
 *
 * Returns normalized environmental events from NASA EONET v3.
 * Falls back to local sample data when EONET is unreachable.
 * Uses server-side caching with a 10-minute revalidation window.
 */
export async function GET() {
  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const result = await fetchEonetEvents();

    if (result.source === "fallback") {
      headers["X-Data-Source"] = "fallback";
    }

    return NextResponse.json(
      {
        events: result.events,
        source: result.source,
        count: result.events.length,
      },
      { headers }
    );
  } catch (error) {
    console.error("[api/events] Unexpected error:", (error as Error).message);

    return NextResponse.json(
      {
        error: "EVENTS_UNAVAILABLE",
        message:
          "Unable to retrieve environmental events at this time. Please try again later.",
        source: "error",
      },
      { status: 502, headers }
    );
  }
}
