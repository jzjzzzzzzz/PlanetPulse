// ============================================================
// Planet Pulse — Location helpers (multi-platform)
// Supports: Vercel, EdgeOne, Cloudflare, browser geolocation
// ============================================================

import type { UserLocation } from "@/types/environment";

function tryDecodeURIComponent(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

/**
 * Try multiple CDN/edge header sources for IP geolocation.
 * Priority: Vercel > EdgeOne > Cloudflare > none
 */
export function getLocationFromHeaders(headers: Headers): UserLocation {
  // Try Vercel headers
  let city = headers.get("x-vercel-ip-city");
  let country = headers.get("x-vercel-ip-country");
  let region = headers.get("x-vercel-ip-country-region");
  let lat = headers.get("x-vercel-ip-latitude");
  let lng = headers.get("x-vercel-ip-longitude");
  let tz = headers.get("x-vercel-ip-timezone");
  let source: UserLocation["source"] = "vercel";

  // Try EdgeOne / Tencent Cloud CDN headers
  if (!city && !country) {
    city = headers.get("eo-client-ip-city") ?? headers.get("x-tencent-ip-city");
    country = headers.get("eo-client-ip-country") ?? headers.get("x-tencent-ip-country");
    region = headers.get("eo-client-ip-region") ?? headers.get("x-tencent-ip-region");
    lat = headers.get("eo-client-ip-latitude");
    lng = headers.get("eo-client-ip-longitude");
    tz = headers.get("eo-client-ip-timezone");
    if (country) source = "edgeone";
  }

  // Try Cloudflare headers
  if (!city && !country) {
    country = headers.get("cf-ipcountry");
    city = headers.get("cf-ipcity");
    region = headers.get("cf-region");
    lat = headers.get("cf-iplatitude");
    lng = headers.get("cf-iplongitude");
    tz = headers.get("cf-timezone");
    if (country) source = "cloudflare";
  }

  const hasAny = city || country || region || lat || lng || tz;
  if (!hasAny) {
    return { city: null, country: null, region: null, latitude: null, longitude: null, timezone: null, source: "unavailable" };
  }

  const latitude = lat ? Number(lat) : null;
  const longitude = lng ? Number(lng) : null;

  return {
    city: city ? tryDecodeURIComponent(city) : null,
    country: country ? tryDecodeURIComponent(country) : null,
    region: region ? tryDecodeURIComponent(region) : null,
    latitude: latitude != null && !Number.isNaN(latitude) ? latitude : null,
    longitude: longitude != null && !Number.isNaN(longitude) ? longitude : null,
    timezone: tz ? tryDecodeURIComponent(tz) : null,
    source,
  };
}

export function getBrowserTimezone(timezone?: string): string | null {
  if (timezone) return timezone;
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null; } catch { return null; }
}

export function formatLocation(location: UserLocation): string {
  const parts: string[] = [];
  if (location.city) parts.push(location.city);
  if (location.region) parts.push(location.region);
  if (location.country) parts.push(location.country);
  return parts.length === 0 ? "Unknown location" : parts.join(", ");
}
