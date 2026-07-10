import { NextRequest, NextResponse } from "next/server";
import { fetchFirmsFires } from "@/lib/nasa/firms";

export const dynamic = "force-dynamic";

/**
 * GET /api/fires?bbox=west,south,east,north&days=1
 *
 * Returns satellite fire/thermal-anomaly detections from NASA FIRMS.
 * Requires NASA_FIRMS_MAP_KEY server-side environment variable.
 * Validates and constrains bounding box and day range.
 */
export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const { searchParams } = new URL(request.url);
    const bboxParam = searchParams.get("bbox");
    const daysParam = searchParams.get("days") ?? "1";

    // Validate bbox
    if (!bboxParam) {
      return NextResponse.json(
        {
          error: "MISSING_BBOX",
          message: "The bbox query parameter is required.",
          detections: [],
        },
        { status: 400, headers }
      );
    }

    const parts = bboxParam.split(",").map(Number);
    if (
      parts.length !== 4 ||
      parts.some((n) => isNaN(n) || n < -180 || n > 180)
    ) {
      return NextResponse.json(
        {
          error: "INVALID_BBOX",
          message:
            "bbox must be four comma-separated numbers: west,south,east,north",
          detections: [],
        },
        { status: 400, headers }
      );
    }

    const [west, south, east, north] = parts;

    // Reject excessively large bounding boxes (> 20 deg on either axis)
    const latSpan = Math.abs(north - south);
    const lngSpan = Math.abs(east - west);
    if (latSpan > 20 || lngSpan > 20) {
      return NextResponse.json(
        {
          error: "BBOX_TOO_LARGE",
          message:
            "Bounding box exceeds maximum size of 20° per axis. Request a smaller region.",
          detections: [],
        },
        { status: 400, headers }
      );
    }

    // Validate and clamp days
    let days = parseInt(daysParam, 10);
    if (isNaN(days) || days < 1) days = 1;
    if (days > 7) days = 7;

    const result = await fetchFirmsFires(
      { west, south, east, north },
      days
    );

    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error("[api/fires] Unexpected error:", (error as Error).message);

    return NextResponse.json(
      {
        error: "FIRES_UNAVAILABLE",
        message:
          "Unable to retrieve fire detections at this time.",
        detections: [],
        source: "error",
      },
      { status: 502, headers }
    );
  }
}
