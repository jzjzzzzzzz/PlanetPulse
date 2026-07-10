import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Returns a minimal structured health-check response.
 * Does not call external APIs, expose secrets, or reveal
 * infrastructure details.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "planet-pulse",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "development",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
