import { NextResponse } from "next/server";
import { fetchTyphoonData } from "@/lib/typhoon/fetch";
import type { TyphoonData, TyphoonApiResponse } from "@/lib/typhoon/types";

export const dynamic = "force-dynamic";

// In-memory cache
type CacheEntry = {
  data: TyphoonData;
  timestamp: number;
};

let _cache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_TTL_MS = 30 * 60 * 1000; // 30 minutes stale

/**
 * GET /api/typhoon
 *
 * Proxy endpoint for JMA typhoon data (Typhoon 2609 巴威 BAVI).
 * Returns normalized typhoon data with 5-minute caching.
 * On fetch failure, returns stale data with error flag.
 */
export async function GET() {
  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    "Access-Control-Allow-Origin": "*",
  };

  const now = Date.now();
  let lastSuccessAt: string | null = _cache?.data?.fetchedAt ?? null;

  // Return fresh cache if available
  if (_cache && now - _cache.timestamp < CACHE_TTL_MS) {
    const response: TyphoonApiResponse = {
      data: _cache.data,
      error: null,
      stale: false,
      lastSuccessAt,
    };
    headers["X-Data-Source"] = "cache-fresh";
    return NextResponse.json(response, { headers });
  }

  try {
    const data = await fetchTyphoonData();

    // Update cache
    _cache = { data, timestamp: now };

    headers["X-Data-Source"] = "live";
    const response: TyphoonApiResponse = {
      data,
      error: null,
      stale: false,
      lastSuccessAt: data.fetchedAt,
    };
    return NextResponse.json(response, { headers });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[api/typhoon] Fetch failed:", errorMessage);

    // Return stale cache if available
    if (_cache && now - _cache.timestamp < STALE_TTL_MS) {
      headers["X-Data-Source"] = "cache-stale";
      const age = Math.round((now - _cache.timestamp) / 1000);
      const response: TyphoonApiResponse = {
        data: _cache.data,
        error: `更新失败，数据可能已过期 (${age}秒前)。${errorMessage}`,
        stale: true,
        lastSuccessAt,
      };
      return NextResponse.json(response, { headers });
    }

    // No cache — return error
    headers["X-Data-Source"] = "error";
    const response: TyphoonApiResponse = {
      data: null,
      error: `数据获取失败：${errorMessage}。请稍后重试。`,
      stale: false,
      lastSuccessAt: null,
    };
    return NextResponse.json(response, { status: 502, headers });
  }
}
