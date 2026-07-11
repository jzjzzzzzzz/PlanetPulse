import { NextRequest, NextResponse } from "next/server";
import { fetchEonetEvents } from "@/lib/nasa/eonet";
import type { EnvironmentalEvent } from "@/types/environment";

export const dynamic = "force-dynamic";

/**
 * GET /api/event/[id]
 *
 * Returns a single environmental event by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const result = await fetchEonetEvents();
    const event = result.events.find((e: EnvironmentalEvent) => e.id === id);

    if (!event) {
      return NextResponse.json(
        { error: "EVENT_NOT_FOUND", message: `Event ${id} not found. It may have been closed or removed.` },
        { status: 404, headers },
      );
    }

    return NextResponse.json({ event, metadata: result.metadata }, { headers });
  } catch (error) {
    console.error(`[api/event/${id}] Error:`, (error as Error).message);
    return NextResponse.json(
      { error: "EVENTS_UNAVAILABLE", message: "Unable to retrieve event data. Please try again later." },
      { status: 502, headers },
    );
  }
}
