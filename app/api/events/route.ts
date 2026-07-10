import { NextResponse } from "next/server";
import { fetchEonetEvents } from "@/lib/nasa/eonet";

export const dynamic = "force-dynamic";

/**
 * GET /api/events
 *
 * Returns normalized environmental events from NASA EONET v3.
 * Falls back to cached data or local sample data when EONET is unreachable.
 * Uses server-side caching with a 10-minute revalidation window.
 */
export async function GET() {
  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const result = await fetchEonetEvents();

    // Add data-source header for observability
    headers["X-Data-Source"] = result.metadata.source;

    if (result.metadata.degradedReason) {
      headers["X-Degraded-Reason"] = result.metadata.degradedReason;
    }

    return NextResponse.json(
      {
        events: result.events,
        metadata: result.metadata,
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
        metadata: {
          source: "fallback",
          provider: "NASA EONET",
          format: "fallback",
          fetchedAt: new Date().toISOString(),
          upstreamUpdatedAt: null,
          eventCount: 0,
          attemptCount: 0,
          degradedReason: `Unexpected error: ${(error as Error).message}`,
        },
      },
      { status: 502, headers }
    );
  }
}
